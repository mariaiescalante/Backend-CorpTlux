import { pool } from "../config/db";

export interface ActivityLog {
  id: number;
  admin_user_id: number;
  action: string;
  entity_type: string;
  entity_id: number;
  changes: unknown;
  created_at: Date | string;
}

export async function log(
  adminUserId: number,
  action: string,
  entityType: string,
  entityId: number,
  changes?: unknown
): Promise<void> {
  await pool.query(
    `INSERT INTO activity_log (admin_user_id, action, entity_type, entity_id, changes)
     VALUES (?, ?, ?, ?, ?)`,
    [adminUserId, action, entityType, entityId, changes === undefined ? null : JSON.stringify(changes)]
  );
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: ActivityLog[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM activity_log");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query(
    `SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { rows: rows as ActivityLog[], total };
}
