import { FastifyInstance } from "fastify";
import { z } from "zod";
import { codParamsSchema, intervencionesQuerySchema } from "../schemas/querySchemas.js";
import { DataStore } from "../types.js";

function sameText(a: string | undefined, b: string | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export async function intervencionesRoutes(app: FastifyInstance, store: DataStore) {
  app.get("/intervenciones", async (request, reply) => {
    const parsed = intervencionesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Parametros invalidos",
        detail: z.treeifyError(parsed.error)
      });
    }

    const { estado, provincia, page, limit } = parsed.data;

    // Aplicamos filtros por coincidencia exacta case-insensitive, tal como pide el enunciado.
    let filtered = store.intervenciones;
    if (estado) {
      filtered = filtered.filter((row) => sameText(row.ESTADO, estado));
    }
    if (provincia) {
      filtered = filtered.filter((row) => sameText(row.PROVINCIA_SEDE, provincia));
    }

    const total = filtered.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const data = filtered.slice(start, end);

    return reply.send({
      page,
      limit,
      total,
      data
    });
  });

  app.get("/intervenciones/:cod", async (request, reply) => {
    const parsed = codParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.status(400).send({
        error: "Parametro de ruta invalido",
        detail: z.treeifyError(parsed.error)
      });
    }

    const cod = parsed.data.cod.trim();
    const intervencion = store.intervencionesByIncidencia.get(cod);
    if (!intervencion) {
      return reply.status(404).send({
        error: "Intervencion no encontrada",
        cod
      });
    }

    return reply.send({
      intervencion,
      horas: store.horasByIncidencia.get(cod) ?? [],
      materiales: store.materialesByIncidencia.get(cod) ?? [],
      desplazamientos: store.desplazamientosByIncidencia.get(cod) ?? []
    });
  });
}
