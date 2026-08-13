import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { hashPassword, comparePassword } from "../utils/password";
import * as adminUserModel from "../models/adminUser.model";
import * as activityLogModel from "../models/activityLog.model";
import { makeCrudController } from "../utils/crudController";
import { toSafeUser } from "../utils/toSafeUser";
import { AuthRequest } from "../middleware/auth";

type AdminUserCreateInput = Omit<adminUserModel.AdminUserInput, "password_hash"> & { password: string };

export const adminUserController = makeCrudController<AdminUserCreateInput>({
  findAll: async (page = 1, limit = 20) => {
    const { rows, total } = await adminUserModel.findAll(page, limit);
    return { items: rows.map(toSafeUser), total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  findById: async (id) => {
    const user = await adminUserModel.findById(id);
    return user ? toSafeUser(user) : undefined;
  },
  create: async ({ password, ...data }, actorId) => {
    const existing = await adminUserModel.findByEmail(data.email);
    if (existing) {
      throw new ApiError(409, "Ya existe un usuario con ese email");
    }
    const passwordHash = await hashPassword(password);
    return adminUserModel.create({ ...data, password_hash: passwordHash });
  },
  update: async (id, data, actorId) => {
    const { password, email: _email, ...rest } = data;
    if (password) {
      await adminUserModel.update(id, { ...rest, password_hash: await hashPassword(password) });
    } else {
      await adminUserModel.update(id, rest);
    }
  },
  remove: adminUserModel.remove,
}, "admin_user");

export const getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const user = await adminUserModel.findById(req.adminUserId!);
  if (!user) {
    throw new ApiError(404, "Usuario no encontrado");
  }
  res.json({ user: toSafeUser(user) });
});

export const changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { currentPassword, newPassword, confirmPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new ApiError(400, "Contraseña actual, nueva y confirmación requeridas");
  }
  if (newPassword !== confirmPassword) {
    throw new ApiError(400, "Las contraseñas nuevas no coinciden");
  }
  const user = await adminUserModel.findById(req.adminUserId!);
  if (!user) {
    throw new ApiError(404, "Usuario no encontrado");
  }
  const valid = await comparePassword(currentPassword, user.password_hash);
  if (!valid) {
    throw new ApiError(400, "Contraseña actual incorrecta");
  }
  await adminUserModel.update(user.id, { password_hash: await hashPassword(newPassword) });
  await activityLogModel.log(user.id, "change_password", "admin_user", user.id);
  res.json({ message: "Contraseña actualizada" });
});

export const adminLogController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const { rows, total } = await activityLogModel.findAll(page, limit);
    res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  }),
};
