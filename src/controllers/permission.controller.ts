import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as permissionModel from "../models/permission.model";
import * as roleModel from "../models/role.model";

export const listPermissions = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ items: await permissionModel.findAll() });
});

export const getRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);
  const role = await roleModel.findById(roleId);
  if (!role) {
    throw new ApiError(404, "Rol no encontrado");
  }
  res.json({ items: await permissionModel.findByRoleId(roleId) });
});

export const setRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const roleId = parseInt(req.params.id, 10);
  const { permissionIds } = req.body as { permissionIds?: number[] };
  if (!Array.isArray(permissionIds)) {
    throw new ApiError(400, "permissionIds es requerido");
  }
  const role = await roleModel.findById(roleId);
  if (!role) {
    throw new ApiError(404, "Rol no encontrado");
  }
  await permissionModel.setRolePermissions(roleId, permissionIds);
  res.json({ message: "Permisos actualizados" });
});
