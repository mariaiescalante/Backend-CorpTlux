import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
const { translate } = require("@vitalets/google-translate-api");

const router = Router();

async function robustTranslateText(text: string, targetLang: 'en' | 'pt'): Promise<string> {
  if (!text || !text.trim()) return '';
  const clean = text.trim();
  const target = targetLang === 'pt' ? 'pt' : 'en';

  // 1. Try Google Translate
  try {
    const res = await translate(clean, { from: 'es', to: target });
    if (res?.text && res.text !== clean) return res.text;
  } catch (e) {}

  // 2. Try MyMemory with dynamic email
  try {
    const email = 'tlux_' + Math.floor(Math.random() * 1000000) + '@tlux.studio';
    const langpair = 'es|' + (target === 'pt' ? 'pt-PT' : 'en');
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(clean) + '&langpair=' + langpair + '&de=' + encodeURIComponent(email);
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const json = (await res.json()) as any;
      if (json?.responseData?.translatedText && !json.responseData.translatedText.includes('MYMEMORY WARNING')) {
        return json.responseData.translatedText;
      }
    }
  } catch (e) {}

  return clean;
}

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { text, html, to = "en", from = "es" } = req.body;

    let translatedText = "";
    let translatedHtml = "";

    const targetLang: 'en' | 'pt' = to === "pt" || to === "pt-BR" ? "pt" : "en";

    if (text && typeof text === "string" && text.trim()) {
      translatedText = await robustTranslateText(text, targetLang);
    }

    if (html && typeof html === "string" && html.trim()) {
      try {
        const segments = html.split(/(<[^>]+>)/g);
        const translatedSegments = await Promise.all(
          segments.map(async (seg) => {
            if (!seg.startsWith("<") && seg.trim().length > 0) {
              return await robustTranslateText(seg.trim(), targetLang);
            }
            return seg;
          })
        );
        translatedHtml = translatedSegments.join("");
      } catch (err) {
        console.warn("[TRANSLATE] Error translating html:", err);
        translatedHtml = html;
      }
    }

    res.json({
      success: true,
      data: {
        translatedText,
        translatedHtml,
      },
    });
  })
);

export default router;
