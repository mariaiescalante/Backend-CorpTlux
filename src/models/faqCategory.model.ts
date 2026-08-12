import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";

const JSON_COLS = ["name", "description"];

export interface FaqCategory {
  id: number;
  name: unknown;
  description: unknown;
  position: number;
  status: "active" | "inactive";
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FaqCategoryInput {
  name: unknown;
  description?: unknown;
  position?: number;
  status?: "active" | "inactive";
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: FaqCategory[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM faq_categories");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM faq_categories ORDER BY position, id LIMIT ? OFFSET ?", [limit, offset]);
  return {
    rows: (rows as FaqCategory[]).map((r) => jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS)) as unknown as FaqCategory[],
    total,
  };
}

export async function findById(id: number): Promise<FaqCategory | undefined> {
  const [rows] = await pool.query("SELECT * FROM faq_categories WHERE id = ? LIMIT 1", [id]);
  const found = (rows as FaqCategory[])[0];
  return found ? (jsonColumns(found as unknown as Record<string, unknown>, JSON_COLS) as unknown as FaqCategory) : undefined;
}

export async function create(data: FaqCategoryInput): Promise<number> {
  const [result] = await pool.query(
    "INSERT INTO faq_categories (name, description, position, status) VALUES (?, ?, ?, ?)",
    [
      JSON.stringify(data.name),
      data.description === undefined ? null : JSON.stringify(data.description),
      data.position ?? 0,
      data.status ?? "active",
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<FaqCategoryInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Categoría FAQ no encontrada");
  }
  await pool.query(
    `UPDATE faq_categories SET
       name = ?,
       description = ?,
       position = COALESCE(?, position),
       status = COALESCE(?, status)
     WHERE id = ?`,
    [
      data.name === undefined ? JSON.stringify(current.name) : JSON.stringify(data.name),
      data.description === undefined
        ? JSON.stringify(current.description)
        : data.description === null
          ? null
          : JSON.stringify(data.description),
      data.position ?? null,
      data.status ?? null,
      id,
    ]
  );
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM faq_categories WHERE id = ?", [id]);
}
