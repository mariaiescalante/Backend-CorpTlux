import * as faqModel from "../models/faq.model";
import { makeCrudController } from "../utils/crudController";
import { ApiError } from "../utils/ApiError";

export const faqController = makeCrudController<faqModel.FaqInput>(
  {
    findAll: async (page = 1, limit = 20) => {
      const { rows, total } = await faqModel.findAll(page, limit);
      return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
    },
    findById: faqModel.findById,
    create: async (data, actorId) => {
      if (!actorId) {
        throw new ApiError(401, "No autenticado");
      }
      return faqModel.create({ ...data, created_by: actorId });
    },
    update: async (id, data, actorId) => {
      if (!actorId) {
        throw new ApiError(401, "No autenticado");
      }
      return faqModel.update(id, { ...data, updated_by: actorId });
    },
    remove: faqModel.remove,
  },
  "faq"
);