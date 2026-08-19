import { Router } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

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

// GET /api/categories - Listar categorías de Artículos de Blog
router.get("/", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, slug, description FROM categories ORDER BY id DESC"
  );
  const formatted = (rows as any[]).map((r) => ({
    id: String(r.id),
    name: parseText(r.name),
    slug: parseText(r.slug),
    description: parseText(r.description),
  }));
  res.json({ success: true, data: formatted });
}));

// POST /api/categories - Crear categoría de Artículos de Blog en MySQL
router.post("/", asyncHandler(async (req, res) => {
  const { name, slug, description } = req.body;
  if (!name) {
    res.status(400).json({ success: false, error: "El nombre de categoría es obligatorio" });
    return;
  }
  const nameStr = typeof name === "string" ? name : (name.es || name.en || "Categoría");
  const slugStr = slug || nameStr.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');

  const [result] = await pool.query(
    `INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)`,
    [
      JSON.stringify({ es: nameStr, en: nameStr }),
      JSON.stringify({ es: slugStr, en: slugStr }),
      JSON.stringify({ es: description || "", en: description || "" })
    ]
  );
  const insertId = (result as { insertId: number }).insertId;
  res.status(201).json({ success: true, data: { id: String(insertId), name: nameStr, slug: slugStr } });
}));

// DELETE /api/categories/:id - Eliminar categoría de Artículos
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM categories WHERE id = ?", [id]);
  res.json({ success: true, message: "Categoría eliminada de MySQL" });
}));

export default router;
