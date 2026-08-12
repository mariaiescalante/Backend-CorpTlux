import { Router } from "express";
import { roleController } from "../controllers/role.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createRoleSchema, updateRoleSchema } from "../validators/domainSchemas";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Listar roles
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de roles }
 *   post:
 *     summary: Crear rol
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               description: { type: string, nullable: true }
 *     responses:
 *       201: { description: Creado }
 */
router.get("/", requirePermission("role.view"), roleController.list);
router.get("/:id", validate({ params: idParam }), requirePermission("role.view"), roleController.get);
router.post("/", requirePermission("role.create"), validate({ body: createRoleSchema }), roleController.create);
router.put("/:id", validate({ params: idParam, body: updateRoleSchema }), requirePermission("role.update"), roleController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("role.delete"), roleController.remove);

export default router;
