import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { ApiError } from "../utils/ApiError";
import { pool } from "../config/db";

export function requirePermission(permissionName: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    (async () => {
      const authReq = req as AuthRequest;
      if (!authReq.roleId) {
        throw new ApiError(401, "No autenticado");
      }

      // Super Admin (Role 5) and Admin (Role 2) bypass
      if (authReq.roleId === 5 || authReq.roleId === 2) {
        return next();
      }

      const pluralName = permissionName.includes('.') && !permissionName.split('.')[0].endsWith('s')
        ? permissionName.replace(/^([^.]+)/, '$1s')
        : permissionName;
      const singularName = permissionName.includes('.') && permissionName.split('.')[0].endsWith('s')
        ? permissionName.replace(/^([^.]+)s\./, '$1.')
        : permissionName;

      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND (p.name = ? OR p.name = ? OR p.name = ?)`,
        [authReq.roleId, permissionName, singularName, pluralName]
      );

      const cnt = (rows as { cnt: number }[])[0].cnt;
      if (cnt === 0) {
        throw new ApiError(403, `Permiso requerido: ${permissionName}`);
      }
      next();
    })().catch(next);
  };
}
