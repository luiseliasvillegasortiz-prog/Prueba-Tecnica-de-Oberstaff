import { DataStore, ResumenKpis, Row } from "../types.js";

const ESTADOS_CERRADA = new Set(["Finalizado", "Albaranado", "No facturar", "Anulado"]);
const ESTADOS_PENDIENTE = new Set(["Asignado", "Preasignada", "Sin Asignar", "Pendiente"]);

function toNumber(value: string | undefined): number {
  if (!value || value.trim() === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumHoras(rows: Row[]): { coste: number; venta: number } {
  let coste = 0;
  let venta = 0;
  for (const row of rows) {
    coste += toNumber(row.COSTE);
    venta += toNumber(row.VENTA);
  }
  return { coste, venta };
}

function sumMateriales(rows: Row[]): { coste: number; venta: number } {
  let coste = 0;
  let venta = 0;
  for (const row of rows) {
    const unidades = toNumber(row.UNIDADES);
    coste += unidades * toNumber(row.PRECIO_COSTE);
    venta += unidades * toNumber(row.PRECIO_VENTA);
  }
  return { coste, venta };
}

function sumDesplazamientos(rows: Row[]): { coste: number; venta: number } {
  let coste = 0;
  let venta = 0;
  for (const row of rows) {
    coste += toNumber(row.PRECIO_COSTE);
    venta += toNumber(row.PRECIO_VENTA);
  }
  return { coste, venta };
}

export function buildResumenKpis(store: DataStore): ResumenKpis {
  let totalCerradas = 0;
  let totalPendientes = 0;

  for (const itv of store.intervenciones) {
    const estado = (itv.ESTADO ?? "").trim();
    if (ESTADOS_CERRADA.has(estado)) totalCerradas += 1;
    if (ESTADOS_PENDIENTE.has(estado)) totalPendientes += 1;
  }

  const horas = sumHoras(store.horas);
  const materiales = sumMateriales(store.materiales);
  const desplaz = sumDesplazamientos(store.desplazamientos);

  return {
    total_intervenciones: store.intervenciones.length,
    total_cerradas: totalCerradas,
    total_pendientes: totalPendientes,
    coste_total: round2(horas.coste + materiales.coste + desplaz.coste),
    venta_total: round2(horas.venta + materiales.venta + desplaz.venta)
  };
}
