import fs from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { DataStore, Row } from "../types.js";

function normalizeCod(value: string | undefined): string {
  return (value ?? "").trim();
}

function indexByIncidencia(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const cod = normalizeCod(row.COD_INCIDENCIA);
    if (!cod) continue;
    const group = map.get(cod);
    if (group) group.push(row);
    else map.set(cod, [row]);
  }
  return map;
}

async function readCsv(filePath: string): Promise<Row[]> {
  const raw = await fs.readFile(filePath, "utf8");
  const rows = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true
  }) as Row[];
  return rows;
}

export async function loadDataStore(): Promise<DataStore> {
  // Detectamos carpeta real para soportar tanto estructura final como entorno actual.
  const candidates = [
    path.resolve(process.cwd(), "../muestras"),
    path.resolve(process.cwd(), "../.cursor/skills/muestras")
  ];

  let baseDir = "";
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      baseDir = candidate;
      break;
    } catch {
      // seguimos probando siguiente ruta
    }
  }

  if (!baseDir) {
    throw new Error("No se encontro carpeta de muestras. Se esperaba ../muestras o ../.cursor/skills/muestras");
  }

  const intervenciones = await readCsv(path.join(baseDir, "vista_climasur_intervenciones.csv"));
  const horas = await readCsv(path.join(baseDir, "vista_climasur_intervenciones_horas.csv"));
  const materiales = await readCsv(path.join(baseDir, "vista_climasur_intervenciones_materiales.csv"));
  const desplazamientos = await readCsv(path.join(baseDir, "vista_climasur_desplazamientos.csv"));

  const intervencionesByIncidencia = new Map<string, Row>();
  for (const row of intervenciones) {
    const cod = normalizeCod(row.COD_INCIDENCIA);
    if (!cod) continue;
    intervencionesByIncidencia.set(cod, row);
  }

  return {
    intervenciones,
    horas,
    materiales,
    desplazamientos,
    horasByIncidencia: indexByIncidencia(horas),
    materialesByIncidencia: indexByIncidencia(materiales),
    desplazamientosByIncidencia: indexByIncidencia(desplazamientos),
    intervencionesByIncidencia
  };
}
