import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";

const JSON_COLS = ["question", "answer"];

export interface Faq {
  id: number;
  faq_category_id: number;
  question: unknown;
  answer: unknown;
  position: number;
  status: "active" | "inactive";
  created_by: number | null;
  updated_by: number | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface FaqInput {
  faq_category_id: number;
  question: unknown;
  answer: unknown;
  position?: number;
  status?: "active" | "inactive";
  created_by?: number | null;
  updated_by?: number | null;
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: Faq[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM faqs");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM faqs ORDER BY position, id LIMIT ? OFFSET ?", [limit, offset]);
  return {
    rows: (rows as Faq[]).map((r) => jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS)) as unknown as Faq[],
    total,
  };
}

export async function findById(id: number): Promise<Faq | undefined> {
  const [rows] = await pool.query("SELECT * FROM faqs WHERE id = ? LIMIT 1", [id]);
  const found = (rows as Faq[])[0];
  return found ? (jsonColumns(found as unknown as Record<string, unknown>, JSON_COLS) as unknown as Faq) : undefined;
}

export async function create(data: FaqInput): Promise<number> {
  const [result] = await pool.query(
    "INSERT INTO faqs (faq_category_id, question, answer, position, status, created_by) VALUES (?, ?, ?, ?, ?, ?)",
    [
      data.faq_category_id,
      JSON.stringify(data.question),
      JSON.stringify(data.answer),
      data.position ?? 0,
      data.status ?? "active",
      data.created_by ?? null,
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<FaqInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "FAQ no encontrada");
  }
  await pool.query(
    `UPDATE faqs SET
       faq_category_id = COALESCE(?, faq_category_id),
       question = ?,
       answer = ?,
       position = COALESCE(?, position),
       status = COALESCE(?, status),
       updated_by = ?
     WHERE id = ?`,
    [
      data.faq_category_id ?? null,
      data.question === undefined ? JSON.stringify(current.question) : JSON.stringify(data.question),
      data.answer === undefined ? JSON.stringify(current.answer) : JSON.stringify(data.answer),
      data.position ?? null,
      data.status ?? null,
      data.updated_by ?? null,
      id,
    ]
  );
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM faqs WHERE id = ?", [id]);
}
