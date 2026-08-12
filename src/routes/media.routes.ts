import { Router } from "express";
import { mediaController } from "../controllers/media.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createMediaSchema, updateMediaSchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /media:
 *   get:
 *     summary: Listar media (público)
 *     tags: [Media]
 *     responses:
 *       200: { description: Lista de media }
 *   post:
 *     summary: Registrar media (requiere permiso)
 *     tags: [Media]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [public_id, url]
 *             properties:
 *               provider: { type: string, enum: [cloudinary, s3, local, other] }
 *               public_id: { type: string }
 *               url: { type: string, format: url }
 *               mime_type: { type: string, nullable: true }
 *               width: { type: integer, nullable: true }
 *               height: { type: integer, nullable: true }
 *               size_bytes: { type: integer, nullable: true }
 *               alt_text: { type: object, nullable: true }
 *     responses:
 *       201: { description: Creado }
 */
router.get("/", mediaController.list);
router.get("/:id", validate({ params: idParam }), mediaController.get);

router.use(authenticate);
router.post("/", requirePermission("media.upload"), validate({ body: createMediaSchema }), mediaController.create);
router.put("/:id", validate({ params: idParam, body: updateMediaSchema }), requirePermission("media.update"), mediaController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("media.delete"), mediaController.remove);

export default router;
