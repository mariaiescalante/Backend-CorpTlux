import { pool } from "../config/db";

export interface PasswordResetToken {
  id: number;
  admin_user_id: number;
  token_hash: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  created_at: Date | string;
}

export async function create(
  adminUserId: number,
  tokenHash: string,
  expiresAt: Date
): Promise<number> {
  const [result] = await pool.query(
    "INSERT INTO password_reset_tokens (admin_user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [adminUserId, tokenHash, expiresAt]
  );
  return (result as { insertId: number }).insertId;
}

export async function findValid(tokenHash: string): Promise<PasswordResetToken | undefined> {
  const [rows] = await pool.query(
    `SELECT * FROM password_reset_tokens
     WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return (rows as PasswordResetToken[])[0];
}

export async function markUsed(id: number): Promise<void> {
  await pool.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?", [id]);
}
