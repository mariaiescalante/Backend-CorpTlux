import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";

const JSON_COLS = ["name", "description", "slug", "meta_title", "meta_description"];

export interface Category {
  id: number;
  parent_id: number | null;
  cover_media_id: number | null;
  name: unknown;
  description: unknown;
  slug: unknown;
  meta_title: unknown;
  meta_description: unknown;
  position: number;
  status: "active" | "inactive";
  slug_es: string | null;
  slug_en: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface CategoryInput {
  parent_id?: number | null;
  cover_media_id?: number | null;
  name: unknown;
  description?: unknown;
  slug: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  position?: number;
  status?: "active" | "inactive";
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: Category[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM categories");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM categories ORDER BY position, id LIMIT ? OFFSET ?", [limit, offset]);
  return {
    rows: (rows as Category[]).map((r) => jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS)) as unknown as Category[],
    total,
  };
}

export async function findById(id: number): Promise<Category | undefined> {
  const [rows] = await pool.query("SELECT * FROM categories WHERE id = ? LIMIT 1", [id]);
  const found = (rows as Category[])[0];
  return found ? (jsonColumns(found as unknown as Record<string, unknown>, JSON_COLS) as unknown as Category) : undefined;
}

export async function create(data: CategoryInput): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO categories
       (parent_id, cover_media_id, name, description, slug, meta_title, meta_description, position, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.parent_id ?? null,
      data.cover_media_id ?? null,
      JSON.stringify(data.name),
      data.description === undefined ? null : JSON.stringify(data.description),
      JSON.stringify(data.slug),
      data.meta_title === undefined ? null : JSON.stringify(data.meta_title),
      data.meta_description === undefined ? null : JSON.stringify(data.meta_description),
      data.position ?? 0,
      data.status ?? "active",
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<CategoryInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Categoría no encontrada");
  }
  await pool.query(
    `UPDATE categories SET
       parent_id = ?,
       cover_media_id = ?,
       name = ?,
       description = ?,
       slug = ?,
       meta_title = ?,
       meta_description = ?,
       position = COALESCE(?, position),
       status = COALESCE(?, status)
     WHERE id = ?`,
    [
      data.parent_id === undefined ? current.parent_id : data.parent_id,
      data.cover_media_id === undefined ? current.cover_media_id : data.cover_media_id,
      data.name === undefined ? JSON.stringify(current.name) : JSON.stringify(data.name),
      data.description === undefined
        ? JSON.stringify(current.description)
        : data.description === null
          ? null
          : JSON.stringify(data.description),
      data.slug === undefined ? JSON.stringify(current.slug) : JSON.stringify(data.slug),
      data.meta_title === undefined
        ? JSON.stringify(current.meta_title)
        : data.meta_title === null
          ? null
          : JSON.stringify(data.meta_title),
      data.meta_description === undefined
        ? JSON.stringify(current.meta_description)
        : data.meta_description === null
          ? null
          : JSON.stringify(data.meta_description),
      data.position ?? null,
      data.status ?? null,
      id,
    ]
  );
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM categories WHERE id = ?", [id]);
}
