import { Router } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// Asegurar que la columna 'status' exista en la tabla 'faqs'
async function ensureFaqColumns() {
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM faqs LIKE 'status'");
    if ((cols as any[]).length === 0) {
      await pool.query("ALTER TABLE faqs ADD COLUMN status VARCHAR(20) DEFAULT 'active'");
      console.log("✅ Columna 'status' agregada exitosamente a la tabla 'faqs'");
    }
  } catch (err) {
    console.warn("⚠️ No se pudo verificar columna status en faqs:", err);
  }
}
ensureFaqColumns();

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

// GET /api/faqs/categories - Listar categorías de Preguntas Frecuentes FAQ
router.get("/categories", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query("SELECT id, name, description FROM faq_categories ORDER BY id DESC");
  const formatted = (rows as any[]).map((r) => ({
    id: String(r.id),
    name: parseText(r.name),
    description: parseText(r.description),
  }));
  res.json({ success: true, data: formatted });
}));

// POST /api/faqs/categories - Crear categoría de FAQ en MySQL
router.post("/categories", asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: "El nombre es obligatorio" });
    return;
  }
  const nameStr = typeof name === "string" ? name : (name.es || name.en || "Categoría FAQ");
  const [result] = await pool.query(
    "INSERT INTO faq_categories (name, description) VALUES (?, ?)",
    [JSON.stringify({ es: nameStr, en: nameStr }), JSON.stringify({ es: description || "", en: description || "" })]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ success: true, data: { id: String(insertId), name: nameStr } });
}));

// DELETE /api/faqs/categories/:id - Eliminar categoría FAQ
router.delete("/categories/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM faq_categories WHERE id = ?", [id]);
  res.json({ success: true, message: "Categoría de FAQ eliminada" });
}));

// GET /api/faqs - Listar FAQs guardadas en MySQL
router.get("/", asyncHandler(async (req, res) => {
  const includeAll = req.query.all === 'true';
  const sql = includeAll
    ? `SELECT f.id, f.question, f.answer, COALESCE(f.status, 'active') AS status, fc.name AS category_name 
       FROM faqs f 
       LEFT JOIN faq_categories fc ON f.faq_category_id = fc.id 
       ORDER BY f.id ASC`
    : `SELECT f.id, f.question, f.answer, COALESCE(f.status, 'active') AS status, fc.name AS category_name 
       FROM faqs f 
       LEFT JOIN faq_categories fc ON f.faq_category_id = fc.id 
       WHERE COALESCE(f.status, 'active') = 'active'
       ORDER BY f.id ASC`;

  const [rows] = await pool.query(sql);
  const formatted = (rows as any[]).map((r, idx) => ({
    id: String(r.id),
    number: String(idx + 1).padStart(2, '0'),
    question: parseText(r.question),
    answer: parseText(r.answer),
    category: parseText(r.category_name) || 'GENERAL',
    status: r.status || 'active',
    languages: ['ES', 'EN', 'PT'],
  }));
  res.json({ success: true, data: formatted });
}));

// POST /api/faqs - Crear nueva FAQ en MySQL
router.post("/", asyncHandler(async (req, res) => {
  const { question, answer, category, status } = req.body;
  if (!question || !answer) {
    res.status(400).json({ success: false, error: "Pregunta y Respuesta son obligatorias" });
    return;
  }

  const catName = category ? String(category).trim().toUpperCase() : 'GENERAL';
  const faqStatus = status || 'active';

  let categoryId: number | null = null;
  const [existingCats] = await pool.query("SELECT id FROM faq_categories WHERE name LIKE ? LIMIT 1", [`%${catName}%`]);
  const catArr = existingCats as any[];

  if (catArr && catArr.length > 0) {
    categoryId = catArr[0].id;
  } else {
    const [newCatRes] = await pool.query(
      "INSERT INTO faq_categories (name, description) VALUES (?, ?)",
      [JSON.stringify({ es: catName, en: catName }), JSON.stringify({ es: catName, en: catName })]
    );
    categoryId = (newCatRes as { insertId: number }).insertId;
  }

  const [result] = await pool.query(
    "INSERT INTO faqs (faq_category_id, question, answer, status) VALUES (?, ?, ?, ?)",
    [categoryId, JSON.stringify({ es: question, en: question }), JSON.stringify({ es: answer, en: answer }), faqStatus]
  );
  const insertId = (result as { insertId: number }).insertId;

  res.status(201).json({
    success: true,
    data: {
      id: String(insertId),
      number: '01',
      question,
      answer,
      category: catName,
      status: faqStatus,
      languages: ['ES', 'EN', 'PT'],
    },
  });
}));

// PUT /api/faqs/:id - Editar FAQ completa en MySQL
router.put("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { question, answer, category, status } = req.body;

  let catName = 'GENERAL';
  let categoryId: number | null = null;

  if (category) {
    catName = String(category).trim().toUpperCase();
    const [existingCats] = await pool.query("SELECT id FROM faq_categories WHERE name LIKE ? LIMIT 1", [`%${catName}%`]);
    const catArr = existingCats as any[];

    if (catArr && catArr.length > 0) {
      categoryId = catArr[0].id;
    } else {
      const [newCatRes] = await pool.query(
        "INSERT INTO faq_categories (name, description) VALUES (?, ?)",
        [JSON.stringify({ es: catName, en: catName }), JSON.stringify({ es: catName, en: catName })]
      );
      categoryId = (newCatRes as { insertId: number }).insertId;
    }
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (question !== undefined) {
    updates.push("question = ?");
    params.push(JSON.stringify({ es: question, en: question }));
  }
  if (answer !== undefined) {
    updates.push("answer = ?");
    params.push(JSON.stringify({ es: answer, en: answer }));
  }
  if (categoryId !== null) {
    updates.push("faq_category_id = ?");
    params.push(categoryId);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    params.push(status);
  }

  if (updates.length > 0) {
    params.push(id);
    await pool.query(`UPDATE faqs SET ${updates.join(", ")} WHERE id = ?`, params);
  }

  res.json({
    success: true,
    data: {
      id,
      question,
      answer,
      category: catName,
      status,
    },
  });
}));

// PATCH /api/faqs/:id/status - Habilitar / Deshabilitar FAQ (status: 'active' | 'inactive')
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status || !['active', 'inactive'].includes(status)) {
    res.status(400).json({ success: false, error: "Status debe ser 'active' o 'inactive'" });
    return;
  }

  await pool.query("UPDATE faqs SET status = ? WHERE id = ?", [status, id]);
  res.json({ success: true, message: `Estado de la FAQ actualizado a ${status}`, status });
}));

// DELETE /api/faqs/:id - Eliminar FAQ de MySQL
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM faqs WHERE id = ?", [id]);
  res.json({ success: true, message: "FAQ eliminada de MySQL" });
}));

export default router;
