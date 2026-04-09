import { FastifyInstance } from "fastify";
import { DataStore } from "../types.js";
import { buildResumenKpis } from "../services/kpiService.js";

export async function kpisRoutes(app: FastifyInstance, store: DataStore) {
  app.get("/kpis/resumen", async (_request, reply) => {
    // Centralizamos calculo en servicio para mantener la ruta simple y trazable.
    const resumen = buildResumenKpis(store);
    return reply.send(resumen);
  });
}
