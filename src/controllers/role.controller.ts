import * as roleModel from "../models/role.model";
import { makeCrudController } from "../utils/crudController";

export const roleController = makeCrudController<roleModel.RoleInput>({
  findAll: async (page = 1, limit = 20) => {
    const { rows, total } = await roleModel.findAll(page, limit);
    return { items: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
  },
  findById: roleModel.findById,
  create: roleModel.create,
  update: roleModel.update,
  remove: roleModel.remove,
}, "role");
