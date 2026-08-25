import { Router, Request, Response } from 'express';
import { HermesService } from '../services/hermesService';

const router = Router();

/**
 * POST /api/ai/chat
 * Recibe el prompt y el historial de conversación para interactuar con Hermes AI
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt, history } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'El campo "prompt" es requerido.' });
      return;
    }

    const result = await HermesService.chatWithAgent(prompt, history || []);
    res.json({
      success: true,
      reply: result.reply,
      toolExecutions: result.toolExecutions,
    });
  } catch (error: any) {
    console.error('[HERMES_AI_ERROR]', error);
    res.status(500).json({
      error: error.message || 'Error interno al procesar la solicitud con Hermes AI',
    });
  }
});

/**
 * GET /api/ai/status
 * Verifica la disponibilidad del agente Hermes AI
 */
router.get('/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const status = await HermesService.getStatus();
    res.json(status);
  } catch (error: any) {
    res.status(500).json({
      online: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/ai/translate
 * Traduce un objeto de campos (título, descripción, entregables, etc.) a los idiomas objetivo (en, pt)
 */
router.post('/translate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { fields, sourceLang = 'es', targetLangs = ['en', 'pt'] } = req.body;

    if (!fields || typeof fields !== 'object') {
      res.status(400).json({ error: 'El campo "fields" es requerido y debe ser un objeto.' });
      return;
    }

    const translations = await HermesService.translateFields(fields, sourceLang, targetLangs);
    res.json({
      success: true,
      translations
    });
  } catch (error: any) {
    console.error('[HERMES_TRANSLATE_ERROR]', error);
    res.status(500).json({
      error: error.message || 'Error al traducir campos con IA',
    });
  }
});

export default router;
