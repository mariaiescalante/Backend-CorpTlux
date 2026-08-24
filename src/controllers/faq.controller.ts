import { Request, Response } from "express";
import * as faqModel from "../models/faq.model";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as activityLogModel from "../models/activityLog.model";
import { AuthRequest } from "../middleware/auth";

export const faqController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
    const { rows, total } = await faqModel.findAll(page, limit, categoryId);
    res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  }),

  get: asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const item = await faqModel.findById(id);
    if (!item) {
      throw new ApiError(404, "FAQ no encontrada");
    }
    res.json({ item });
  }),

  create: asyncHandler(async (req: AuthRequest, res: Response) => {
    const actorId = req.adminUserId;
    if (!actorId) {
      throw new ApiError(401, "No autenticado");
    }
    const id = await faqModel.create({ ...req.body, created_by: actorId });
    await activityLogModel.log(actorId, "create", "faq", id, req.body);
    const item = await faqModel.findById(id);
    res.status(201).json({ id, item });
  }),

  update: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const actorId = req.adminUserId;
    if (!actorId) {
      throw new ApiError(401, "No autenticado");
    }
    await faqModel.update(id, { ...req.body, updated_by: actorId });
    await activityLogModel.log(actorId, "update", "faq", id, req.body);
    res.json({ message: "Actualizado" });
  }),

  remove: asyncHandler(async (req: AuthRequest, res: Response) => {
    const id = parseInt(req.params.id, 10);
    const actorId = req.adminUserId;
    if (!actorId) {
      throw new ApiError(401, "No autenticado");
    }
    const item = await faqModel.findById(id);
    if (!item) {
      throw new ApiError(404, "FAQ no encontrada");
    }
    await faqModel.remove(id);
    await activityLogModel.log(actorId, "delete", "faq", id);
    res.json({ message: "Eliminado" });
  }),
};
