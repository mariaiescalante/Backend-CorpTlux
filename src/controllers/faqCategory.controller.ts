import * as faqCategoryModel from "../models/faqCategory.model";
import { makeCrudController } from "../utils/crudController";

export const faqCategoryController = makeCrudController<faqCategoryModel.FaqCategoryInput>({
  findAll: async (page = 1, limit = 20) => {
    const { rows, total } = await faqCategoryModel.findAll(page, limit);
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  findById: faqCategoryModel.findById,
  create: faqCategoryModel.create,
  update: faqCategoryModel.update,
  remove: faqCategoryModel.remove,
}, "faq_category");
