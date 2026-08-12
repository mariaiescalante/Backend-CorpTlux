import { pool } from "../config/db";

export interface Permission {
  id: number;
  name: string;
  description: string | null;
}

export async function findAll(): Promise<Permission[]> {
  const [rows] = await pool.query("SELECT * FROM permissions ORDER BY name");
  return rows as Permission[];
}

export async function findByRoleId(roleId: number): Promise<Permission[]> {
  const [rows] = await pool.query(
    `SELECT p.* FROM permissions p
     JOIN role_permissions rp ON rp.permission_id = p.id
     WHERE rp.role_id = ?
     ORDER BY p.name`,
    [roleId]
  );
  return rows as Permission[];
}

export async function setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  return import("./rolePermission.model").then((m) => m.setRolePermissions(roleId, permissionIds));
}
