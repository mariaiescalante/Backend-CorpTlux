import { Request, Response } from "express";
import { sha256 } from "../utils/crypto";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { comparePassword, hashPassword } from "../utils/password";
import { signToken, verifyToken } from "../utils/jwt";
import * as adminUserModel from "../models/adminUser.model";
import * as adminSessionModel from "../models/adminSession.model";
import * as passwordResetTokenModel from "../models/passwordResetToken.model";
import * as activityLogModel from "../models/activityLog.model";
import { AuthRequest } from "../middleware/auth";
import { toSafeUser } from "../utils/toSafeUser";
import { sendPasswordResetEmail } from "../services/passwordRecoveryService";
import { config } from "../config";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };
  if (!email || !password) {
    throw new ApiError(400, "Email y contraseña son requeridos");
  }

  const user = await adminUserModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, "Credenciales inválidas");
  }
  if (user.status !== "active") {
    throw new ApiError(403, "Cuenta no activa");
  }
  const valid = await comparePassword(password, user.password_hash);
  if (!valid) {
    throw new ApiError(401, "Credenciales inválidas");
  }

  const token = signToken({
    sub: String(user.id),
    adminUserId: user.id,
    roleId: user.role_id,
    name: user.name,
    email: user.email,
  });

  const expiresAt = new Date(
    Date.now() + (config.jwt.expiresIn.endsWith("d") ? parseInt(config.jwt.expiresIn, 10) * 86400000 : 7 * 86400000)
  );
  const tokenHash = sha256(token);
  const sessionId = await adminSessionModel.create({
    admin_user_id: user.id,
    token_hash: tokenHash,
    expires_at: expiresAt,
    ip_address: req.ip ?? null,
    user_agent: req.headers["user-agent"] ?? null,
  });

  await adminUserModel.updateLastLogin(user.id);
  await activityLogModel.log(user.id, "login", "admin_session", sessionId);

  res.json({ token, user: toSafeUser(user) });
});

export const me = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await adminUserModel.findById(req.adminUserId!);
  if (!user) {
    throw new ApiError(404, "Usuario no encontrado");
  }
  const permissions = await import("../models/permission.model").then((m) => m.findByRoleId(user.role_id));
  res.json({ user: toSafeUser(user), permissions });
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (token) {
    const session = await adminSessionModel.findByTokenHash(sha256(token));
    if (session) {
      await adminSessionModel.revoke(session.id);
      await activityLogModel.log(req.adminUserId!, "logout", "admin_session", session.id);
    }
  }
  res.json({ message: "Sesión cerrada" });
});

export const requestPasswordReset = asyncHandler(async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };
  if (!email) {
    throw new ApiError(400, "Email requerido");
  }
  await sendPasswordResetEmail(email);
  res.json({ message: "Si el email existe, se envió un enlace de recuperación" });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, password } = req.body as { token?: string; password?: string };
  if (!token || !password) {
    throw new ApiError(400, "Token y nueva contraseña requeridos");
  }
  const record = await passwordResetTokenModel.findValid(sha256(token));
  if (!record) {
    throw new ApiError(400, "Token inválido o expirado");
  }
  const passwordHash = await hashPassword(password);
  await adminUserModel.update(record.admin_user_id, { password_hash: passwordHash });
  await passwordResetTokenModel.markUsed(record.id);
  res.json({ message: "Contraseña actualizada" });
});

export { verifyToken };
