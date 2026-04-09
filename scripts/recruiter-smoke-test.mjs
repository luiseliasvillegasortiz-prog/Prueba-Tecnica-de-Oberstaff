import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const apiDir = path.join(root, "ejercicio_2_api");
const etlDir = path.join(root, "ejercicio_3_etl");

function cmdForPlatform() {
  return process.platform === "win32"
    ? { runner: "cmd", args: ["/c"] }
    : { runner: "bash", args: ["-lc"] };
}

function runCommand(command, cwd) {
  const { runner, args } = cmdForPlatform();
  return new Promise((resolve, reject) => {
    const child = spawn(runner, [...args, command], {
      cwd,
      stdio: "inherit",
      shell: false
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Comando fallo (${code}): ${command}`));
    });
  });
}

async function fetchJson(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

async function waitForApiReady(url, tries = 25) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const response = await fetchJson(url, 2500);
      if (response.ok) return true;
    } catch {
      // retry
    }
    await sleep(600);
  }
  return false;
}

async function main() {
  console.log("== Smoke test tecnico (API + ETL) ==");

  console.log("\n[1/4] Instalando dependencias API...");
  await runCommand("npm install", apiDir);

  console.log("\n[2/4] Arrancando y validando API...");
  const { runner, args } = cmdForPlatform();
  const apiProcess = spawn(runner, [...args, "npm start"], {
    cwd: apiDir,
    stdio: "inherit",
    shell: false
  });

  try {
    const ready = await waitForApiReady("http://127.0.0.1:3000/kpis/resumen");
    if (!ready) throw new Error("La API no quedo lista en puerto 3000.");

    const kpisResponse = await fetchJson("http://127.0.0.1:3000/kpis/resumen");
    const kpis = await kpisResponse.json();
    if (kpis.total_intervenciones !== 100) {
      throw new Error(`KPI inesperado: total_intervenciones=${kpis.total_intervenciones}`);
    }

    const listResponse = await fetchJson("http://127.0.0.1:3000/intervenciones?page=1&limit=5");
    const list = await listResponse.json();
    if (list.page !== 1 || list.limit !== 5) {
      throw new Error("Paginacion inesperada en /intervenciones.");
    }

    const detailResponse = await fetchJson("http://127.0.0.1:3000/intervenciones/13027");
    const detail = await detailResponse.json();
    if (!detail.intervencion) {
      throw new Error("No llego detalle de /intervenciones/:cod.");
    }

    const dashboardResponse = await fetchJson("http://127.0.0.1:3000/dashboard");
    if (dashboardResponse.status !== 200) throw new Error("Dashboard no disponible.");

    const badQueryResponse = await fetchJson("http://127.0.0.1:3000/intervenciones?page=0");
    if (badQueryResponse.status !== 400) throw new Error("No retorno 400 para query invalida.");

    const missingResponse = await fetchJson("http://127.0.0.1:3000/intervenciones/999999999");
    if (missingResponse.status !== 404) throw new Error("No retorno 404 para COD inexistente.");

    console.log("API OK: endpoints principales verificados.");
  } finally {
    if (!apiProcess.killed) {
      apiProcess.kill("SIGTERM");
      await sleep(500);
      if (!apiProcess.killed) apiProcess.kill("SIGKILL");
    }
  }

  console.log("\n[3/4] Instalando dependencias ETL...");
  await runCommand("npm install", etlDir);

  console.log("\n[4/4] Ejecutando ETL...");
  await runCommand("node sync.js", etlDir);

  console.log("\nSmoke test finalizado correctamente.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
