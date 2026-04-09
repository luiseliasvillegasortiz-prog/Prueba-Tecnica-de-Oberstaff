const fs = require("node:fs/promises");
const path = require("node:path");
const { parse } = require("csv-parse/sync");

const ESTADOS_CERRADA = new Set(["Finalizado", "Albaranado", "No facturar", "Anulado"]);
const ESTADOS_PENDIENTE = new Set(["Asignado", "Preasignada", "Sin Asignar", "Pendiente"]);
const ASSUMED_TIMEZONE = "Europe/Madrid";

function nowTimestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  return { fileSafe: `${y}${m}${d}_${hh}${mm}${ss}`, iso: `${y}-${m}-${d}T${hh}:${mm}:${ss}` };
}

function toNumber(value) {
  if (value === undefined || value === null) return 0;
  const text = String(value).trim().replace(",", ".");
  if (!text) return 0;
  const num = Number(text);
  return Number.isFinite(num) ? num : 0;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function classifyEstado(estado) {
  const normalized = (estado || "").trim();
  if (ESTADOS_CERRADA.has(normalized)) return "Cerrada";
  if (ESTADOS_PENDIENTE.has(normalized)) return "Pendiente";
  return null;
}

function hhmmToDecimalHours(value) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw);
  if (!match) return 0;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes) || minutes < 0 || minutes > 59) return 0;
  return round2(hours + minutes / 60);
}

function parseIsoDate(dateText) {
  const text = String(dateText || "").trim();
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

async function readCsv(filePath) {
  const content = await fs.readFile(filePath, "utf8");
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true
  });
}

async function resolveSamplesBaseDir() {
  const candidates = [
    path.resolve(__dirname, "../muestras"),
    path.resolve(__dirname, "../.cursor/skills/muestras")
  ];

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // probar siguiente ruta
    }
  }
  throw new Error("No se encontro carpeta de muestras. Se esperaba ../muestras o ../.cursor/skills/muestras");
}

function appendToMapSum(map, key, amount, field) {
  const current = map.get(key) || {};
  current[field] = round2((current[field] || 0) + amount);
  map.set(key, current);
}

async function run() {
  const execution = nowTimestamp();
  const warnings = [];

  // Documentamos zona horaria asumida en log para trazabilidad del ETL.
  warnings.push(`[INFO] Zona horaria asumida para interpretar ISO sin offset: ${ASSUMED_TIMEZONE}`);

  const baseDir = await resolveSamplesBaseDir();
  const intervenciones = await readCsv(path.join(baseDir, "vista_climasur_intervenciones.csv"));
  const horas = await readCsv(path.join(baseDir, "vista_climasur_intervenciones_horas.csv"));
  const materiales = await readCsv(path.join(baseDir, "vista_climasur_intervenciones_materiales.csv"));
  const desplazamientos = await readCsv(path.join(baseDir, "vista_climasur_desplazamientos.csv"));

  const horasAgg = new Map();
  for (const row of horas) {
    const cod = String(row.COD_INCIDENCIA || "").trim();
    if (!cod) continue;

    const start = parseIsoDate(row.FECHA_INICIO);
    const end = parseIsoDate(row.FECHA_FIN);
    if (!start || !end) {
      warnings.push(
        `[WARN] Horas ignoradas por fecha invalida COD_INCIDENCIA=${cod} FECHA_INICIO='${row.FECHA_INICIO || ""}' FECHA_FIN='${row.FECHA_FIN || ""}'`
      );
      continue;
    }

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) {
      warnings.push(
        `[WARN] Horas ignoradas por rango invertido COD_INCIDENCIA=${cod} FECHA_INICIO='${row.FECHA_INICIO || ""}' FECHA_FIN='${row.FECHA_FIN || ""}'`
      );
      continue;
    }

    const diffHours = diffMs / (1000 * 60 * 60);
    appendToMapSum(horasAgg, cod, diffHours, "HorasImputadas_h");
  }

  const materialesAgg = new Map();
  for (const row of materiales) {
    const cod = String(row.COD_INCIDENCIA || "").trim();
    if (!cod) continue;
    const unidades = toNumber(row.UNIDADES);
    const coste = unidades * toNumber(row.PRECIO_COSTE);
    const venta = unidades * toNumber(row.PRECIO_VENTA);
    appendToMapSum(materialesAgg, cod, coste, "ImporteCoste");
    appendToMapSum(materialesAgg, cod, venta, "ImporteVenta");
  }

  const desplazAgg = new Map();
  for (const row of desplazamientos) {
    const cod = String(row.COD_INCIDENCIA || "").trim();
    if (!cod) continue;
    appendToMapSum(desplazAgg, cod, toNumber(row.PRECIO_COSTE), "CosteDesplaz");
    appendToMapSum(desplazAgg, cod, toNumber(row.PRECIO_VENTA), "VentaDesplaz");
  }

  const outputRows = [];
  let withHoras = 0;
  let withoutHoras = 0;

  for (const row of intervenciones) {
    const cod = String(row.COD_INCIDENCIA || "").trim();
    const horasData = horasAgg.get(cod);
    const materialesData = materialesAgg.get(cod);
    const desplazData = desplazAgg.get(cod);

    const horasImputadas = horasData ? round2(horasData.HorasImputadas_h || 0) : null;
    if (horasImputadas === null) withoutHoras += 1;
    else withHoras += 1;

    outputRows.push({
      ...row,
      Estado_Clasificacion: classifyEstado(row.ESTADO),
      DuracionPlanificada_h: hhmmToDecimalHours(row.DURACION_PLANIFICADA),
      HorasImputadas_h: horasImputadas,
      ImporteCoste: materialesData ? round2(materialesData.ImporteCoste || 0) : null,
      ImporteVenta: materialesData ? round2(materialesData.ImporteVenta || 0) : null,
      CosteDesplaz: desplazData ? round2(desplazData.CosteDesplaz || 0) : null,
      VentaDesplaz: desplazData ? round2(desplazData.VentaDesplaz || 0) : null
    });
  }

  const outputDir = path.resolve(__dirname, "output");
  await fs.mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, `interv_analitica_${execution.fileSafe}.json`);
  await fs.writeFile(jsonPath, JSON.stringify(outputRows, null, 2), "utf8");

  // CSV adicional por requisito de generar ambos formatos.
  const csvHeaders = Object.keys(outputRows[0] || {});
  const csvLines = [csvHeaders.join(",")];
  for (const outputRow of outputRows) {
    const line = csvHeaders
      .map((header) => {
        const value = outputRow[header];
        if (value === null || value === undefined) return "";
        const text = String(value);
        if (text.includes(",") || text.includes('"') || text.includes("\n")) {
          return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
      })
      .join(",");
    csvLines.push(line);
  }
  const csvPath = path.join(outputDir, `interv_analitica_${execution.fileSafe}.csv`);
  await fs.writeFile(csvPath, csvLines.join("\n"), "utf8");

  const logPath = path.resolve(__dirname, "sync.log");
  const logEntry = [
    `[${execution.iso}] ETL ejecutado`,
    `- filas_procesadas: ${intervenciones.length}`,
    `- filas_con_horas_imputadas: ${withHoras}`,
    `- filas_sin_horas: ${withoutHoras}`,
    `- output_json: ${jsonPath}`,
    `- output_csv: ${csvPath}`,
    warnings.length ? "- incidencias:" : "- incidencias: ninguna"
  ];
  if (warnings.length) {
    for (const warning of warnings) logEntry.push(`  ${warning}`);
  }
  logEntry.push("");

  await fs.appendFile(logPath, `${logEntry.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        ok: true,
        filas_procesadas: intervenciones.length,
        filas_con_horas_imputadas: withHoras,
        filas_sin_horas: withoutHoras,
        output_json: jsonPath,
        output_csv: csvPath,
        warnings: warnings.length
      },
      null,
      2
    )
  );
}

run().catch(async (error) => {
  const execution = nowTimestamp();
  const logPath = path.resolve(__dirname, "sync.log");
  const message = `[${execution.iso}] ETL error fatal\n- error: ${error && error.message ? error.message : String(error)}\n`;
  await fs.appendFile(logPath, `${message}\n`, "utf8");
  console.error(error);
  process.exit(1);
});
