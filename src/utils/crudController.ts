import { Request, Response } from "express";
import { asyncHandler } from "./asyncHandler";
import { ApiError } from "./ApiError";
import { Paginated } from "./pagination";
import { AuthRequest } from "../middleware/auth";
import * as activityLogModel from "../models/activityLog.model";

interface CrudService<Input> {
  findAll(page?: number, limit?: number): Promise<Paginated<unknown>>;
  findById(id: number): Promise<unknown | undefined>;
  create(data: Input, actorId?: number): Promise<number>;
  update(id: number, data: Partial<Input>, actorId?: number): Promise<void>;
  remove(id: number, actorId?: number): Promise<void>;
}

function actorIdOf(req: Request): number | undefined {
  return (req as AuthRequest).adminUserId;
}

export function makeCrudController<Input>(service: CrudService<Input>, entityName = "recurso") {
  return {
    list: asyncHandler(async (req: Request, res: Response) => {
      const page = parseInt(req.query.page as string, 10) || 1;
      const limit = parseInt(req.query.limit as string, 10) || 20;
      const result = await service.findAll(page, limit);
      res.json(result);
    }),
    get: asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const item = await service.findById(id);
      if (!item) {
        throw new ApiError(404, "Recurso no encontrado");
      }
      res.json({ item });
    }),
    create: asyncHandler(async (req: Request, res: Response) => {
      const actorId = actorIdOf(req);
      const id = await service.create(req.body as Input, actorId);
      if (actorId && id) {
        await activityLogModel.log(actorId, "create", entityName, id, req.body);
      }
      const item = await service.findById(id);
      res.status(201).json({ id, item });
    }),
    update: asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const actorId = actorIdOf(req);
      await service.update(id, req.body as Partial<Input>, actorId);
      if (actorId) {
        await activityLogModel.log(actorId, "update", entityName, id, req.body);
      }
      res.json({ message: "Actualizado" });
    }),
    remove: asyncHandler(async (req: Request, res: Response) => {
      const id = parseInt(req.params.id, 10);
      const actorId = actorIdOf(req);
      await service.remove(id, actorId);
      if (actorId) {
        await activityLogModel.log(actorId, "delete", entityName, id);
      }
      res.json({ message: "Eliminado" });
    }),
  };
}