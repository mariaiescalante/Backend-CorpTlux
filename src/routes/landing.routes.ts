import { Router } from "express";
import { getAllLandingSettings, saveLandingSetting, getLandingSetting } from "../models/landing.model";
import { asyncHandler } from "../utils/asyncHandler";
import { processObjectImagesWithCloudinary } from "../services/cloudinaryService";

const router = Router();

// GET /api/landing - Obtener la configuración completa de la Landing Page
router.get("/", asyncHandler(async (_req, res) => {
  const settings = await getAllLandingSettings();
  res.json({ success: true, data: settings });
}));

// GET /api/landing/:sectionKey - Obtener una sección específica
router.get("/:sectionKey", asyncHandler(async (req, res) => {
  const { sectionKey } = req.params;
  const content = await getLandingSetting(sectionKey);
  res.json({ success: true, data: content });
}));

// PUT /api/landing - Guardar configuración completa con procesamiento automático en Cloudinary
router.put("/", asyncHandler(async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== "object") {
    res.status(400).json({ success: false, error: "Cuerpo de datos inválido" });
    return;
  }

  // Procesar automáticamente cualquier imagen hacia Cloudinary
  const processedBody = await processObjectImagesWithCloudinary(body, "corptlux/landing");

  for (const [key, val] of Object.entries(processedBody)) {
    await saveLandingSetting(key, val);
  }

  res.json({ success: true, message: "Configuración de la Landing sincronizada y guardada en Cloudinary + MySQL" });
}));

// PUT /api/landing/:sectionKey - Guardar una sección específica
router.put("/:sectionKey", asyncHandler(async (req, res) => {
  const { sectionKey } = req.params;
  const processedSection = await processObjectImagesWithCloudinary(req.body, "corptlux/landing");
  await saveLandingSetting(sectionKey, processedSection);
  res.json({ success: true, message: `Sección ${sectionKey} sincronizada en Cloudinary + MySQL` });
}));

export default router;
