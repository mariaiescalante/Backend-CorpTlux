import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";

const JSON_COLS = ["alt_text"];

export interface Media {
  id: number;
  provider: "cloudinary" | "s3" | "local" | "other";
  public_id: string;
  url: string;
  resource_type: string | null;
  mime_type: string | null;
  file_extension: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: unknown;
  uploaded_by: number | null;
  created_at: Date | string;
}

export interface MediaInput {
  provider?: Media["provider"];
  public_id: string;
  url: string;
  resource_type?: string | null;
  mime_type?: string | null;
  file_extension?: string | null;
  width?: number | null;
  height?: number | null;
  size_bytes?: number | null;
  alt_text?: unknown;
  uploaded_by?: number | null;
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: Media[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM media");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM media ORDER BY id DESC LIMIT ? OFFSET ?", [limit, offset]);
  return {
    rows: (rows as Media[]).map((r) => jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS)) as unknown as Media[],
    total,
  };
}

export async function findById(id: number): Promise<Media | undefined> {
  const [rows] = await pool.query("SELECT * FROM media WHERE id = ? LIMIT 1", [id]);
  const found = (rows as Media[])[0];
  return found ? (jsonColumns(found as unknown as Record<string, unknown>, JSON_COLS) as unknown as Media) : undefined;
}

export async function create(data: MediaInput): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO media
       (provider, public_id, url, resource_type, mime_type, file_extension, width, height, size_bytes, alt_text, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.provider ?? "cloudinary",
      data.public_id,
      data.url,
      data.resource_type ?? null,
      data.mime_type ?? null,
      data.file_extension ?? null,
      data.width ?? null,
      data.height ?? null,
      data.size_bytes ?? null,
      data.alt_text === undefined ? null : JSON.stringify(data.alt_text),
      data.uploaded_by ?? null,
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<MediaInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Media no encontrado");
  }
  await pool.query(
    `UPDATE media SET
       provider = COALESCE(?, provider),
       public_id = COALESCE(?, public_id),
       url = COALESCE(?, url),
       resource_type = COALESCE(?, resource_type),
       mime_type = COALESCE(?, mime_type),
       file_extension = COALESCE(?, file_extension),
       width = COALESCE(?, width),
       height = COALESCE(?, height),
       size_bytes = COALESCE(?, size_bytes),
       alt_text = ?
     WHERE id = ?`,
    [
      data.provider ?? null,
      data.public_id ?? null,
      data.url ?? null,
      data.resource_type ?? null,
      data.mime_type ?? null,
      data.file_extension ?? null,
      data.width ?? null,
      data.height ?? null,
      data.size_bytes ?? null,
      data.alt_text === undefined ? JSON.stringify(current.alt_text) : JSON.stringify(data.alt_text),
      id,
    ]
  );
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM media WHERE id = ?", [id]);
}
