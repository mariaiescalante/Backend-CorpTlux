import { Router } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
const { translate } = require("@vitalets/google-translate-api");

const router = Router();

async function autoTranslateFaq(text: string, currentVal: string, targetLang: 'en' | 'pt'): Promise<string> {
  if (!text || !text.trim()) return '';
  if (currentVal && currentVal.trim() && currentVal.trim() !== text.trim()) {
    return currentVal.trim();
  }
  try {
    const res = await translate(text.trim(), { from: 'es', to: targetLang });
    return res.text || text;
  } catch (err) {
    console.warn('[TRANSLATE_FAQ] Error:', err);
    return text;
  }
}

function parseText(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed.es || parsed.en || Object.values(parsed)[0] || val;
      }
      return parsed;
    } catch {
      return val;
    }
  }
  if (typeof val === "object") {
    return val.es || val.en || Object.values(val)[0] || "";
  }
  return String(val);
}

function parseMultiLang(val: any, defaultText = ''): { es: string; en: string; pt: string } {
  if (!val) return { es: defaultText, en: defaultText, pt: defaultText };
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      if (typeof parsed === 'object' && parsed !== null) {
        const fallback = parsed.es || parsed.en || parsed.pt || Object.values(parsed)[0] || defaultText;
        return {
          es: parsed.es || fallback,
          en: parsed.en || fallback,
          pt: parsed.pt || parsed['pt-BR'] || fallback,
        };
      }
    } catch {}
    return { es: val, en: val, pt: val };
  }
  if (typeof val === 'object') {
    const fallback = val.es || val.en || val.pt || Object.values(val)[0] || defaultText;
    return {
      es: val.es || fallback,
      en: val.en || fallback,
      pt: val.pt || val['pt-BR'] || fallback,
    };
  }
  return { es: String(val), en: String(val), pt: String(val) };
}

// GET /api/faqs - Listar FAQs (Público y Multi-Idioma)
router.get("/", asyncHandler(async (req, res) => {
  const includeAll = req.query.includeAll === "true" || req.query.admin === "true";
  const sql = includeAll
    ? "SELECT f.id, f.question, f.answer, COALESCE(f.status, 'active') AS status, c.name AS category_name FROM faqs f LEFT JOIN categories c ON f.category_id = c.id AND c.type = 'faq' ORDER BY f.position, f.id ASC"
    : "SELECT f.id, f.question, f.answer, COALESCE(f.status, 'active') AS status, c.name AS category_name FROM faqs f LEFT JOIN categories c ON f.category_id = c.id AND c.type = 'faq' WHERE COALESCE(f.status, 'active') = 'active' ORDER BY f.position, f.id ASC";

  const [rows] = await pool.query(sql);
  const formatted = (rows as any[]).map((r, idx) => {
    const qObj = parseMultiLang(r.question, 'Pregunta sin título');
    const aObj = parseMultiLang(r.answer, 'Sin respuesta');
    const cObj = parseMultiLang(r.category_name, 'GENERAL');

    return {
      id: String(r.id),
      number: String(idx + 1).padStart(2, '0'),
      question: qObj.es,
      questions: qObj,
      answer: aObj.es,
      answers: aObj,
      category: cObj.es,
      categories: cObj,
      status: r.status || 'active',
      languages: ['ES', 'EN', 'PT'],
    };
  });
  res.json({ success: true, data: formatted });
}));

// POST /api/faqs - Crear nueva FAQ con traducción automática Multi-Idioma
router.post(
  "/",
  authenticate,
  requirePermission("faq.create"),
  asyncHandler(async (req, res) => {
    const { question, questions, answer, answers, category, status } = req.body;
    
    const baseQObj = questions || parseMultiLang(question, '');
    const baseAObj = answers || parseMultiLang(answer, '');

    const esQuestion = baseQObj.es || question || '';
    const esAnswer = baseAObj.es || answer || '';

    if (!esQuestion.trim() || !esAnswer.trim()) {
      res.status(400).json({ success: false, error: "Pregunta y Respuesta en español son obligatorias" });
      return;
    }

    const [enQuestion, ptQuestion, enAnswer, ptAnswer] = await Promise.all([
      autoTranslateFaq(esQuestion, baseQObj.en, 'en'),
      autoTranslateFaq(esQuestion, baseQObj.pt, 'pt'),
      autoTranslateFaq(esAnswer, baseAObj.en, 'en'),
      autoTranslateFaq(esAnswer, baseAObj.pt, 'pt'),
    ]);

    const finalQuestions = { es: esQuestion, en: enQuestion, pt: ptQuestion };
    const finalAnswers = { es: esAnswer, en: enAnswer, pt: ptAnswer };

    const catName = category ? String(category).trim().toUpperCase() : 'GENERAL';
    const faqStatus = status || 'active';

    let categoryId: number | null = null;
    const [existingCats] = await pool.query("SELECT id FROM categories WHERE type = 'faq' AND (slug_es LIKE ? OR name LIKE ?) LIMIT 1", [`%${catName}%`, `%${catName}%`]);
    const catArr = existingCats as any[];

    if (catArr && catArr.length > 0) {
      categoryId = catArr[0].id;
    } else {
      const slugStr = catName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const [newCatRes] = await pool.query(
        "INSERT INTO categories (type, name, slug, description, status) VALUES ('faq', ?, ?, ?, 'active')",
        [JSON.stringify({ es: catName, en: catName, pt: catName }), JSON.stringify({ es: slugStr, en: slugStr, pt: slugStr }), JSON.stringify({ es: catName, en: catName, pt: catName })]
      );
      categoryId = (newCatRes as { insertId: number }).insertId;
    }

    const [result] = await pool.query(
      "INSERT INTO faqs (category_id, question, answer, status) VALUES (?, ?, ?, ?)",
      [categoryId, JSON.stringify(finalQuestions), JSON.stringify(finalAnswers), faqStatus]
    );
    const insertId = (result as { insertId: number }).insertId;

    res.status(201).json({
      success: true,
      data: {
        id: String(insertId),
        number: '01',
        question: esQuestion,
        questions: finalQuestions,
        answer: esAnswer,
        answers: finalAnswers,
        category: catName,
        status: faqStatus,
        languages: ['ES', 'EN', 'PT'],
      },
    });
  })
);

// PUT /api/faqs/:id - Editar FAQ con traducción automática
router.put(
  "/:id",
  authenticate,
  requirePermission("faq.update"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { question, questions, answer, answers, category, status } = req.body;

    const [existingRows] = await pool.query("SELECT * FROM faqs WHERE id = ? LIMIT 1", [id]);
    const arr = existingRows as any[];
    if (!arr || arr.length === 0) {
      res.status(404).json({ success: false, error: "FAQ no encontrada" });
      return;
    }
    const current = arr[0];

    const currentQObj = parseMultiLang(current.question, '');
    const currentAObj = parseMultiLang(current.answer, '');

    const baseQObj = questions || (question ? parseMultiLang(question) : currentQObj);
    const baseAObj = answers || (answer ? parseMultiLang(answer) : currentAObj);

    const esQuestion = baseQObj.es || question || currentQObj.es || '';
    const esAnswer = baseAObj.es || answer || currentAObj.es || '';

    const [enQuestion, ptQuestion, enAnswer, ptAnswer] = await Promise.all([
      autoTranslateFaq(esQuestion, baseQObj.en, 'en'),
      autoTranslateFaq(esQuestion, baseQObj.pt, 'pt'),
      autoTranslateFaq(esAnswer, baseAObj.en, 'en'),
      autoTranslateFaq(esAnswer, baseAObj.pt, 'pt'),
    ]);

    const finalQuestions = { es: esQuestion, en: enQuestion, pt: ptQuestion };
    const finalAnswers = { es: esAnswer, en: enAnswer, pt: ptAnswer };

    let catName = 'GENERAL';
    let categoryId: number | null = null;

    if (category) {
      catName = String(category).trim().toUpperCase();
      const [existingCats] = await pool.query("SELECT id FROM categories WHERE type = 'faq' AND (slug_es LIKE ? OR name LIKE ?) LIMIT 1", [`%${catName}%`, `%${catName}%`]);
      const catArr = existingCats as any[];

      if (catArr && catArr.length > 0) {
        categoryId = catArr[0].id;
      } else {
        const slugStr = catName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        const [newCatRes] = await pool.query(
          "INSERT INTO categories (type, name, slug, description, status) VALUES ('faq', ?, ?, ?, 'active')",
          [JSON.stringify({ es: catName, en: catName, pt: catName }), JSON.stringify({ es: slugStr, en: slugStr, pt: slugStr }), JSON.stringify({ es: catName, en: catName, pt: catName })]
        );
        categoryId = (newCatRes as { insertId: number }).insertId;
      }
    }

    const updates: string[] = ["question = ?", "answer = ?"];
    const params: any[] = [JSON.stringify(finalQuestions), JSON.stringify(finalAnswers)];

    if (categoryId !== null) {
      updates.push("category_id = ?");
      params.push(categoryId);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      params.push(status);
    }

    params.push(id);
    await pool.query("UPDATE faqs SET " + updates.join(", ") + " WHERE id = ?", params);

    res.json({
      success: true,
      data: {
        id,
        question: esQuestion,
        questions: finalQuestions,
        answer: esAnswer,
        answers: finalAnswers,
        category: catName,
        status: status || current.status,
      },
    });
  })
);

// PATCH /api/faqs/:id/status - Habilitar / Deshabilitar FAQ
router.patch(
  "/:id/status",
  authenticate,
  requirePermission("faq.update"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      res.status(400).json({ success: false, error: "Status debe ser 'active' o 'inactive'" });
      return;
    }

    await pool.query("UPDATE faqs SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, message: "Estado de la FAQ actualizado a " + status, status });
  })
);

// DELETE /api/faqs/:id - Eliminar FAQ
router.delete(
  "/:id",
  authenticate,
  requirePermission("faq.delete"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await pool.query("DELETE FROM faqs WHERE id = ?", [id]);
    res.json({ success: true, message: "FAQ eliminada de MySQL" });
  })
);

export default router;
