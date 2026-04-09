import { z } from "zod";

// Validamos toda entrada HTTP en un solo lugar para evitar reglas dispersas.
export const intervencionesQuerySchema = z.object({
  estado: z.string().trim().min(1).optional(),
  provincia: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10)
});

export const codParamsSchema = z.object({
  cod: z.string().trim().min(1)
});
