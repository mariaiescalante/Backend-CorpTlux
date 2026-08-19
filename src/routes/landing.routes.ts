import { Router } from "express";
import { getAllLandingSettings, saveLandingSetting, getLandingSetting } from "../models/landing.model";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/landing - Obtener la configuración completa de la Landing Page
router.get("/", asyncHandler(async (_req, res) => {
  const settings = await getAllLandingSettings();
  res.json({ success: true, data: settings });
}));

// GET /api/landing/:sectionKey - Obtener una sección específica (hero, services, etc)
router.get("/:sectionKey", asyncHandler(async (req, res) => {
  const { sectionKey } = req.params;
  const content = await getLandingSetting(sectionKey);
  res.json({ success: true, data: content });
}));

// PUT /api/landing - Guardar configuración completa desde el Panel CMS
router.put("/", asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ success: false, error: "Cuerpo de datos inválido" });
    return;
  }

  for (const [key, val] of Object.entries(body)) {
    await saveLandingSetting(key, val);
  }

  res.json({ success: true, message: "Configuración de la Landing guardada en MySQL" });
}));

// PUT /api/landing/:sectionKey - Guardar una sección específica desde el Panel CMS
router.put("/:sectionKey", asyncHandler(async (req, res) => {
  const { sectionKey } = req.params;
  await saveLandingSetting(sectionKey, req.body);
  res.json({ success: true, message: `Sección ${sectionKey} guardada en MySQL` });
}));

export default router;
