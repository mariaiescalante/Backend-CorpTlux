import * as mediaModel from "../models/media.model";
import { makeCrudController } from "../utils/crudController";
import { ApiError } from "../utils/ApiError";

export const mediaController = makeCrudController<mediaModel.MediaInput>(
  {
    findAll: async (page = 1, limit = 20) => {
      const { rows, total } = await mediaModel.findAll(page, limit);
      return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    findById: mediaModel.findById,
    create: async (data, actorId) => {
      if (!actorId) {
        throw new ApiError(401, "No autenticado");
      }
      return mediaModel.create({ ...data, uploaded_by: actorId });
    },
    update: mediaModel.update,
    remove: mediaModel.remove,
  },
  "media"
);