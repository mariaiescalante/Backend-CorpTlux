import { pool } from "../config/db";

export interface RolePermission {
  role_id: number;
  permission_id: number;
}

export async function findByRoleId(roleId: number): Promise<RolePermission[]> {
  const [rows] = await pool.query(
    "SELECT * FROM role_permissions WHERE role_id = ?",
    [roleId]
  );
  return rows as RolePermission[];
}

export async function findByPermissionId(permissionId: number): Promise<RolePermission[]> {
  const [rows] = await pool.query(
    "SELECT * FROM role_permissions WHERE permission_id = ?",
    [permissionId]
  );
  return rows as RolePermission[];
}

export async function setRolePermissions(roleId: number, permissionIds: number[]): Promise<void> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("DELETE FROM role_permissions WHERE role_id = ?", [roleId]);
    for (const pid of permissionIds) {
      await connection.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [roleId, pid]
      );
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
