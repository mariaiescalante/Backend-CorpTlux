import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";

export interface AdminUser {
  id: number;
  role_id: number;
  name: string;
  email: string;
  password_hash: string;
  avatar_media_id: number | null;
  status: "active" | "inactive" | "suspended";
  last_login_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface AdminUserInput {
  role_id: number;
  name: string;
  email: string;
  password_hash: string;
  avatar_media_id?: number | null;
  status?: "active" | "inactive" | "suspended";
}

export async function findByEmail(email: string): Promise<AdminUser | undefined> {
  const [rows] = await pool.query(
    "SELECT * FROM admin_users WHERE email = ? LIMIT 1",
    [email]
  );
  return (rows as AdminUser[])[0];
}

export async function findById(id: number): Promise<AdminUser | undefined> {
  const [rows] = await pool.query(
    "SELECT * FROM admin_users WHERE id = ? LIMIT 1",
    [id]
  );
  return (rows as AdminUser[])[0];
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: AdminUser[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM admin_users");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query(
    `SELECT id, role_id, name, email, status, last_login_at, created_at, updated_at
     FROM admin_users ORDER BY id LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { rows: rows as AdminUser[], total };
}

export async function create(data: AdminUserInput): Promise<number> {
  const [result] = await pool.query(
    `INSERT INTO admin_users (role_id, name, email, password_hash, avatar_media_id, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.role_id,
      data.name,
      data.email,
      data.password_hash,
      data.avatar_media_id ?? null,
      data.status ?? "active",
    ]
  );
  return (result as { insertId: number }).insertId;
}

export async function update(
  id: number,
  data: Partial<Omit<AdminUserInput, "email">>
): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Usuario no encontrado");
  }
  await pool.query(
    `UPDATE admin_users
     SET role_id = COALESCE(?, role_id),
         name = COALESCE(?, name),
         password_hash = COALESCE(?, password_hash),
         avatar_media_id = ?,
         status = COALESCE(?, status)
     WHERE id = ?`,
    [
      data.role_id ?? null,
      data.name ?? null,
      data.password_hash ?? null,
      data.avatar_media_id === undefined ? current.avatar_media_id : data.avatar_media_id,
      data.status ?? null,
      id,
    ]
  );
}

export async function updateLastLogin(id: number): Promise<void> {
  await pool.query("UPDATE admin_users SET last_login_at = NOW() WHERE id = ?", [id]);
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM admin_users WHERE id = ?", [id]);
}
