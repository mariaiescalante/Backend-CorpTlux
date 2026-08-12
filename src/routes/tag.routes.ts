import { Router } from "express";
import { tagController } from "../controllers/tag.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createTagSchema, updateTagSchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /tags:
 *   get:
 *     summary: Listar tags (público)
 *     tags: [Tags]
 *     responses:
 *       200: { description: Lista de tags }
 *   post:
 *     summary: Crear tag
 *     tags: [Tags]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug]
 *             properties:
 *               name: { type: object }
 *               slug: { type: object }
 *     responses:
 *       201: { description: Creado }
 */
router.get("/", tagController.list);
router.get("/:id", validate({ params: idParam }), tagController.get);

router.use(authenticate);
router.post("/", requirePermission("tag.create"), validate({ body: createTagSchema }), tagController.create);
router.put("/:id", validate({ params: idParam, body: updateTagSchema }), requirePermission("tag.update"), tagController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("tag.delete"), tagController.remove);

export default router;
