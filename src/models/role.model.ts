import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";

export interface Role {
  id: number;
  name: string;
  description: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface RoleInput {
  name: string;
  description?: string | null;
}

export async function findById(id: number): Promise<Role | undefined> {
  const [rows] = await pool.query("SELECT * FROM roles WHERE id = ? LIMIT 1", [id]);
  return (rows as Role[])[0];
}

export async function findAll(page = 1, limit = 20): Promise<{ rows: Role[]; total: number }> {
  const offset = (page - 1) * limit;
  const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM roles");
  const total = (countRows as { total: number }[])[0].total;
  const [rows] = await pool.query("SELECT * FROM roles ORDER BY id LIMIT ? OFFSET ?", [limit, offset]);
  return { rows: rows as Role[], total };
}

export async function create(data: RoleInput): Promise<number> {
  const [result] = await pool.query("INSERT INTO roles (name, description) VALUES (?, ?)", [
    data.name,
    data.description ?? null,
  ]);
  return (result as { insertId: number }).insertId;
}

export async function update(id: number, data: Partial<RoleInput>): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new ApiError(404, "Rol no encontrado");
  }
  await pool.query("UPDATE roles SET name = COALESCE(?, name), description = ? WHERE id = ?", [
    data.name ?? null,
    data.description === undefined ? current.description : data.description,
    id,
  ]);
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM roles WHERE id = ?", [id]);
}
