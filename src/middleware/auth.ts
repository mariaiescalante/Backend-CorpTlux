import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";

export interface AuthRequest extends Request {
  adminUserId?: number;
  roleId?: number;
  name?: string;
  email?: string;
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new ApiError(401, "Token de autenticación requerido");
  }
  try {
    const payload = verifyToken(header.slice(7));
    req.adminUserId = payload.adminUserId;
    req.roleId = payload.roleId;
    req.name = payload.name;
    req.email = payload.email;
    next();
  } catch {
    throw new ApiError(401, "Token inválido o expirado");
  }
}
