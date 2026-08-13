import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { sha256 } from "../utils/crypto";
import { ApiError } from "../utils/ApiError";
import { pool } from "../config/db";

export interface AuthRequest extends Request {
  adminUserId?: number;
  roleId?: number;
  name?: string;
  email?: string;
  sessionId?: number;
}

interface SessionRow {
  id: number;
  revoked_at: string | null;
  expires_at: string;
}

function parseMysqlDate(value: string): Date {
  return new Date(String(value).replace(" ", "T"));
}

export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    next(new ApiError(401, "Token de autenticación requerido"));
    return;
  }

  try {
    const payload = verifyToken(header.slice(7));

    const [rows] = await pool.query(
      "SELECT id, revoked_at, expires_at FROM admin_sessions WHERE token_hash = ? LIMIT 1",
      [sha256(header.slice(7))]
    );
    const session = (rows as SessionRow[])[0];
    if (!session) {
      next(new ApiError(401, "Sesión no válida o expirada"));
      return;
    }
    if (session.revoked_at) {
      next(new ApiError(401, "Sesión cerrada"));
      return;
    }
    if (parseMysqlDate(session.expires_at) <= new Date()) {
      next(new ApiError(401, "Sesión expirada"));
      return;
    }

    req.adminUserId = payload.adminUserId;
    req.roleId = payload.roleId;
    req.name = payload.name;
    req.email = payload.email;
    req.sessionId = session.id;
    next();
  } catch {
    next(new ApiError(401, "Token inválido o expirado"));
  }
}
