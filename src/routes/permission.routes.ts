import { Router } from "express";
import { listPermissions, getRolePermissions, setRolePermissions } from "../controllers/permission.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { setRolePermissionsSchema } from "../validators/domainSchemas";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /permissions:
 *   get:
 *     summary: Listar todos los permisos
 *     tags: [Permissions]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Lista de permisos }
 */
router.get("/", requirePermission("permission.view"), listPermissions);
router.get("/roles/:id", validate({ params: idParam }), requirePermission("role.view"), getRolePermissions);

/**
 * @swagger
 * /permissions/roles/{id}:
 *   put:
 *     summary: Asignar permisos a un rol
 *     tags: [Permissions]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { name: id, in: path, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permissionIds]
 *             properties:
 *               permissionIds: { type: array, items: { type: integer } }
 *     responses:
 *       200: { description: Permisos actualizados }
 */
router.put("/roles/:id", validate({ params: idParam, body: setRolePermissionsSchema }), requirePermission("role.update"), setRolePermissions);

export default router;
