import * as tagModel from "../models/tag.model";
import { makeCrudController } from "../utils/crudController";

export const tagController = makeCrudController<tagModel.TagInput>({
  findAll: async (page = 1, limit = 20) => {
    const { rows, total } = await tagModel.findAll(page, limit);
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  findById: tagModel.findById,
  create: tagModel.create,
  update: tagModel.update,
  remove: tagModel.remove,
}, "tag");
