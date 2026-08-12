import { Router } from "express";
import { faqCategoryController } from "../controllers/faqCategory.controller";
import { faqController } from "../controllers/faq.controller";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
import { validate } from "../middleware/validate";
import { idParam } from "../validators/commonSchemas";
import { createFaqCategorySchema, updateFaqCategorySchema, createFaqSchema, updateFaqSchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /faqs:
 *   get:
 *     summary: Listar FAQs (público)
 *     tags: [FAQs]
 *     responses:
 *       200: { description: Lista de FAQs }
 *   post:
 *     summary: Crear FAQ
 *     tags: [FAQs]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [faq_category_id, question, answer]
 *             properties:
 *               faq_category_id: { type: integer }
 *               question: { type: object }
 *               answer: { type: object }
 *               position: { type: integer }
 *               status: { type: string, enum: [active, inactive] }
 *     responses:
 *       201: { description: Creado }
 */
router.get("/categories", faqCategoryController.list);
router.get("/categories/:id", validate({ params: idParam }), faqCategoryController.get);
router.get("/", faqController.list);
router.get("/:id", validate({ params: idParam }), faqController.get);

/**
 * @swagger
 * /faqs/categories:
 *   get:
 *     summary: Listar categorías de FAQ (público)
 *     tags: [FAQs]
 *     responses:
 *       200: { description: Lista de categorías FAQ }
 */
router.use(authenticate);
router.post("/categories", requirePermission("faq.create"), validate({ body: createFaqCategorySchema }), faqCategoryController.create);
router.put("/categories/:id", validate({ params: idParam, body: updateFaqCategorySchema }), requirePermission("faq.update"), faqCategoryController.update);
router.delete("/categories/:id", validate({ params: idParam }), requirePermission("faq.delete"), faqCategoryController.remove);
router.post("/", requirePermission("faq.create"), validate({ body: createFaqSchema }), faqController.create);
router.put("/:id", validate({ params: idParam, body: updateFaqSchema }), requirePermission("faq.update"), faqController.update);
router.delete("/:id", validate({ params: idParam }), requirePermission("faq.delete"), faqController.remove);

export default router;
