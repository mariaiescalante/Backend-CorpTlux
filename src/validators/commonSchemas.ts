import { z } from "zod";

export const positiveInt = z.number().int().positive();

export const idParam = z.object({
  id: z.coerce.number().int().positive("El id debe ser un entero positivo"),
});

export const jsonField = z.record(z.string(), z.unknown()).or(z.array(z.unknown()));

export const nullableJsonField = z
  .record(z.string(), z.unknown())
  .or(z.array(z.unknown()))
  .nullable();

export const isoDate = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD o ISO"))
  .nullable();

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const statusEnum = z.enum(["active", "inactive"]);
export const articleStatusEnum = z.enum(["draft", "scheduled", "published", "archived"]);
