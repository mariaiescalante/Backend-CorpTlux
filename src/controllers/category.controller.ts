import { Request, Response } from "express";
import * as categoryModel from "../models/category.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as activityLogModel from "../models/activityLog.model";
import { AuthRequest } from "../middleware/auth";

export const categoryController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const type = req.query.type as string | undefined;
    const status = req.query.status as "active" | "inactive" | undefined;

    const { rows, total } = await categoryModel.findAll({ type, status }, page, limit);
    res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const item = await categoryModel.findById(id);
    if (!item) {
      throw new ApiError(404, "Categoría no encontrada");
    }
    res.json({ item });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const actorId = req.adminUserId;
    const id = await categoryModel.create(req.body);
    if (actorId && id) {
      await activityLogModel.log(actorId, "create", "category", id, req.body);
    }
    const item = await categoryModel.findById(id);
    res.status(201).json({ id, item });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const actorId = req.adminUserId;
    await categoryModel.update(id, req.body);
    if (actorId) {
      await activityLogModel.log(actorId, "update", "category", id, req.body);
    }
    res.json({ message: "Actualizado" });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const actorId = req.adminUserId;
    const item = await categoryModel.findById(id);
    if (!item) {
      throw new ApiError(404, "Categoría no encontrada");
    }
    await categoryModel.remove(id);
    if (actorId) {
      await activityLogModel.log(actorId, "delete", "category", id);
    }
    res.json({ message: "Eliminado" });
  }),
};
