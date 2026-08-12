import { Router } from "express";
import { categoryController } from "../controllers/category.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createCategorySchema, updateCategorySchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Listar categorías (público)
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Lista de categorías
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items: { type: array, items: { type: object } }
 */
router.get("/", categoryController.list);
router.get("/:id", validate({ params: idParam }), categoryController.get);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Crear categoría (requiere permiso)
 *     tags: [Categories]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               parent_id: { type: integer, nullable: true }
 *               cover_media_id: { type: integer, nullable: true }
 *               name: { type: object }
 *               slug: { type: object }
 *               position: { type: integer }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       201: { description: Creado }
 *       400: { description: Validación fallida }
 */
router.use(authenticate);
router.post("/", requirePermission("category.create"), validate({ body: createCategorySchema }), categoryController.create);
router.put("/:id", validate({ params: idParam, body: updateCategorySchema }), requirePermission("category.update"), categoryController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("category.delete"), categoryController.remove);

export default router;
