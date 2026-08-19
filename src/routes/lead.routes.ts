import { Router } from "express";
import { findAllLeads, createLead, updateLeadStatus, deleteLead, findLeadById } from "../models/lead.model";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

// GET /api/leads - Lista todos los leads recibidos
router.get("/", asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 50;
  const data = await findAllLeads(page, limit);
  res.json({ success: true, data: data.rows, total: data.total });
}));

// POST /api/leads - Crear lead desde el formulario público de la Landing
router.post("/", asyncHandler(async (req, res) => {
  const { name, email, subtitle } = req.body;
  if (!name || !email) {
    res.status(400).json({ success: false, error: "Nombre y Email son obligatorios" });
    return;
  }
  const id = await createLead({ name, email, subtitle: subtitle || "Consulta desde Landing" });
  const created = await findLeadById(id);
  res.status(201).json({ success: true, data: created });
}));

// PATCH /api/leads/:id/status - Cambiar estado (ATENDIDO / ARCHIVADO) desde CMS
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  await updateLeadStatus(id, status);
  res.json({ success: true, message: "Estado actualizado" });
}));

// DELETE /api/leads/:id - Eliminar lead desde CMS
router.delete("/:id", asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await deleteLead(id);
  res.json({ success: true, message: "Lead eliminado" });
}));

export default router;
