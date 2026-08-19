import { pool } from "../config/db";

export interface LandingSetting {
  section_key: string;
  content_json: unknown;
  updated_at?: Date | string;
}

export async function getLandingSetting(sectionKey: string): Promise<unknown | null> {
  const [rows] = await pool.query("SELECT content_json FROM landing_settings WHERE section_key = ? LIMIT 1", [sectionKey]);
  const found = (rows as { content_json: unknown }[])[0];
  if (!found) return null;
  return typeof found.content_json === "string" ? JSON.parse(found.content_json) : found.content_json;
}

export async function saveLandingSetting(sectionKey: string, content: unknown): Promise<void> {
  const jsonString = JSON.stringify(content);
  await pool.query(
    `INSERT INTO landing_settings (section_key, content_json) 
     VALUES (?, ?) 
     ON DUPLICATE KEY UPDATE content_json = VALUES(content_json), updated_at = CURRENT_TIMESTAMP`,
    [sectionKey, jsonString]
  );
}

export async function getAllLandingSettings(): Promise<Record<string, unknown>> {
  const [rows] = await pool.query("SELECT section_key, content_json FROM landing_settings");
  const result: Record<string, unknown> = {};
  for (const row of rows as { section_key: string; content_json: unknown }[]) {
    result[row.section_key] = typeof row.content_json === "string" ? JSON.parse(row.content_json) : row.content_json;
  }
  return result;
}
