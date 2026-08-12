import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";

const JSON_COLS = ["name", "slug"];

export interface Tag {
  id: number;
  name: unknown;
  slug: unknown;
  slug_es: string | null;
  slug_en: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface TagInput {
  name: unknown;
  slug: unknown;
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: Tag[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM tags");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM tags ORDER BY id LIMIT ? OFFSET ?", [limit, offset]);
  return {
    rows: (rows as Tag[]).map((r) => jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS)) as unknown as Tag[],
    total,
  };
}

export async function findById(id: number): Promise<Tag | undefined> {
  const [rows] = await pool.query("SELECT * FROM tags WHERE id = ? LIMIT 1", [id]);
  const found = (rows as Tag[])[0];
  return found ? (jsonColumns(found as unknown as Record<string, unknown>, JSON_COLS) as unknown as Tag) : undefined;
}

export async function create(data: TagInput): Promise<number> {
  const [result] = await pool.query("INSERT INTO tags (name, slug) VALUES (?, ?)", [
    JSON.stringify(data.name),
    JSON.stringify(data.slug),
  ]);
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<TagInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Tag no encontrado");
  }
  await pool.query("UPDATE tags SET name = ?, slug = ? WHERE id = ?", [
    data.name === undefined ? JSON.stringify(current.name) : JSON.stringify(data.name),
    data.slug === undefined ? JSON.stringify(current.slug) : JSON.stringify(data.slug),
    id,
  ]);
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM tags WHERE id = ?", [id]);
}
