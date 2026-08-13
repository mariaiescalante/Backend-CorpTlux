import { Router } from "express";
import { adminUserController, getProfile, changePassword, adminLogController } from "../controllers/adminUser.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createAdminUserSchema, updateAdminUserSchema, changePasswordSchema } from "../validators/domainSchemas";

const router = Router();

router.use(authenticate);

router.get("/profile", getProfile);
router.post("/change-password", validate({ body: changePasswordSchema }), changePassword);
router.get("/logs", requirePermission("activity_log.view"), adminLogController.list);

router.get("/", requirePermission("admin_user.view"), adminUserController.list);

/**
 * @swagger
 * /admin-users/{id}:
 *   get:
 *     summary: Obtener un admin user por id
 *     tags: [Admin Users]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Usuario }
 *       401: { description: No autenticado }
 *       403: { description: Permiso requerido }
 */
router.get("/:id", validate({ params: idParam }), requirePermission("admin_user.view"), adminUserController.get);

/**
 * @swagger
 * /admin-users:
 *   post:
 *     summary: Crear admin user
 *     tags: [Admin Users]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role_id, name, email, password]
 *             properties:
 *               role_id: { type: integer }
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               status: { type: string, enum: [active, inactive, suspended] }
 *     responses:
 *       201: { description: Creado }
 *       409: { description: Email duplicado }
 */
router.post("/", requirePermission("admin_user.create"), validate({ body: createAdminUserSchema }), adminUserController.create);
router.put("/:id", validate({ params: idParam, body: updateAdminUserSchema }), requirePermission("admin_user.update"), adminUserController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("admin_user.delete"), adminUserController.remove);

export default router;
