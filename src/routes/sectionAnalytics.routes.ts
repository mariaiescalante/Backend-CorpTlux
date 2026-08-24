import { Router } from 'express';
import { getSectionMetrics, trackSectionEngagement } from '../models/sectionAnalytics.model';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/analytics/sections - Retorna el ranking y métricas de atención por sección
router.get('/sections', asyncHandler(async (_req, res) => {
  const data = await getSectionMetrics();
  res.json({ success: true, data });
}));

// POST /api/analytics/sections - Registra tiempo y visitas de una sección
router.post('/sections', asyncHandler(async (req, res) => {
  const { sectionId, seconds, isNewView } = req.body;
  if (!sectionId) {
    res.status(400).json({ success: false, error: 'sectionId es obligatorio' });
    return;
  }
  await trackSectionEngagement(sectionId, Number(seconds) || 0, Boolean(isNewView));
  res.json({ success: true, message: 'Métricas de sección actualizadas' });
}));

export default router;
