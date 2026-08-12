import { Router } from "express";
import { listArticles, getArticle, createArticle, updateArticle, deleteArticle, listRevisions, incrementViews } from "../controllers/article.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createArticleSchema, updateArticleSchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Listar artículos (público, filtros opcionales)
 *     tags: [Articles]
 *     parameters:
 *       - { name: status, in: query, required: false, schema: { type: string, enum: [draft, scheduled, published, archived] } }
 *       - { name: categoryId, in: query, required: false, schema: { type: integer } }
 *     responses:
 *       200: { description: Lista de artículos }
 *   post:
 *     summary: Crear artículo
 *     tags: [Articles]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category_id, title, content, slug]
 *             properties:
 *               category_id: { type: integer }
 *               title: { type: object }
 *               content: { type: object }
 *               slug: { type: object }
 *               status: { type: string, enum: [draft, scheduled, published, archived] }
 *               is_featured: { type: boolean }
 *               tag_ids: { type: array, items: { type: integer } }
 *               media_ids: { type: array, items: { type: integer } }
 *     responses:
 *       201: { description: Creado }
 *       400: { description: Validación fallida }
 */
router.get("/", listArticles);
router.get("/:id", validate({ params: idParam }), getArticle);
router.post("/:id/views", validate({ params: idParam }), incrementViews);
router.get("/:id/revisions", validate({ params: idParam }), authenticate, requirePermission("article.view"), listRevisions);

router.use(authenticate);
router.post("/", requirePermission("article.create"), validate({ body: createArticleSchema }), createArticle);
router.put("/:id", validate({ params: idParam, body: updateArticleSchema }), requirePermission("article.update"), updateArticle);
router.delete("/:id", validate({ params: idParam }), requirePermission("article.delete"), deleteArticle);

export default router;
