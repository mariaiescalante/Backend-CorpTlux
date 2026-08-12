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

      const [rows] = await pool.query(
        `SELECT COUNT(*) AS cnt
         FROM role_permissions rp
         JOIN permissions p ON p.id = rp.permission_id
         WHERE rp.role_id = ? AND p.name = ?`,
        [authReq.roleId, permissionName]
      );

      const cnt = (rows as { cnt: number }[])[0].cnt;
      if (cnt === 0) {
        throw new ApiError(403, `Permiso requerido: ${permissionName}`);
      }
      next();
    })().catch(next);
  };
}
