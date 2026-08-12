import * as categoryModel from "../models/category.model";
import { makeCrudController } from "../utils/crudController";

export const categoryController = makeCrudController<categoryModel.CategoryInput>({
  findAll: async (page = 1, limit = 20) => {
    const { rows, total } = await categoryModel.findAll(page, limit);
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  findById: categoryModel.findById,
  create: categoryModel.create,
  update: categoryModel.update,
  remove: categoryModel.remove,
}, "category");
