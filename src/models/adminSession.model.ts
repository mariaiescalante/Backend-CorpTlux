import { pool } from "../config/db";

export interface AdminSession {
  id: number;
  admin_user_id: number;
  token_hash: string;
  expires_at: Date | string;
  revoked_at: Date | string | null;
  last_activity_at: Date | string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date | string;
}

export async function create(
  data: Pick<
    AdminSession,
    "admin_user_id" | "token_hash" | "expires_at" | "ip_address" | "user_agent"
  >
): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO admin_sessions
       (admin_user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?)`,
    [data.admin_user_id, data.token_hash, data.expires_at, data.ip_address, data.user_agent]
  );
  return (result as { insertId: number }).insertId;
}

export async function findByTokenHash(tokenHash: string): Promise<AdminSession | undefined> {
  const [rows] = await pool.query(
    "SELECT * FROM admin_sessions WHERE token_hash = ? LIMIT 1",
    [tokenHash]
  );
  return (rows as AdminSession[])[0];
}

export async function revoke(id: number): Promise<void> {
  await pool.query(
    "UPDATE admin_sessions SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL",
    [id]
  );
}

export async function touch(id: number): Promise<void> {
  await pool.query("UPDATE admin_sessions SET last_activity_at = NOW() WHERE id = ?", [id]);
}
