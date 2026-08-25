import { Router } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadImageUrlToCloudinary, processHtmlImagesWithCloudinary } from "../services/cloudinaryService";
import { authenticate } from "../middleware/auth";
import { requirePermission } from "../middleware/requirePermission";
const { translate } = require("@vitalets/google-translate-api");

const router = Router();

async function autoTranslateIfSame(text: string, currentVal: string, targetLang: 'en' | 'pt'): Promise<string> {
  if (!text || !text.trim()) return '';
  // Si el valor actual ya fue traducido por el usuario (es diferente del español), respetarlo
  if (currentVal && currentVal.trim() && currentVal.trim() !== text.trim()) {
    return currentVal.trim();
  }
  try {
    const res = await translate(text.trim(), { from: 'es', to: targetLang });
    return res.text || text;
  } catch (err) {
    console.warn('[TRANSLATE_AUTO] Error:', err);
    return text;
  }
}

async function autoTranslateHtmlIfSame(html: string, currentHtml: string, targetLang: 'en' | 'pt'): Promise<string> {
  if (!html || !html.trim()) return '';
  if (currentHtml && currentHtml.trim() && currentHtml.trim() !== html.trim()) {
    return currentHtml.trim();
  }
  try {
    const segments = html.split(/(<[^>]+>)/g);
    const translated = await Promise.all(
      segments.map(async (seg) => {
        if (!seg.startsWith('<') && seg.trim().length > 0) {
          const res = await translate(seg.trim(), { from: 'es', to: targetLang });
          return res.text;
        }
        return seg;
      })
    );
    return translated.join('');
  } catch (err) {
    console.warn('[TRANSLATE_HTML_AUTO] Error:', err);
    return html;
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

// GET /api/articles - Listar artículos guardados en MySQL (Multi-Idioma)
router.get("/", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, title, slug, excerpt, content, cover_image, status, views_count, created_at FROM articles ORDER BY id DESC"
  );
  const formatted = (rows as any[]).map((r) => {
    const rawCover = r.cover_image ? parseText(r.cover_image) : "";
    const titleObj = parseMultiLang(r.title, 'Nuevo Artículo');
    const slugObj = parseMultiLang(r.slug, 'articulo-' + r.id);
    const excerptObj = parseMultiLang(r.excerpt, '');
    const contentObj = parseMultiLang(r.content, '');

    return {
      id: String(r.id),
      code: "[ ART-" + String(r.id).padStart(3, '0') + " ]",
      title: titleObj.es,
      titles: titleObj,
      slug: slugObj.es,
      slugs: slugObj,
      excerpt: excerptObj.es,
      excerpts: excerptObj,
      content: contentObj.es,
      contents: contentObj,
      coverImage: rawCover || '',
      cover_image: rawCover || '',
      category: 'TECNOLOGÍA',
      author: 'Equipo TLUX',
      date: r.created_at ? String(r.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      views: (r.views_count || 0) + 'k',
      status: (r.status === 'published' || r.status === 'PUBLICADO') ? 'PUBLICADO' : 'BORRADOR',
      languages: ['ES', 'EN', 'PT'],
    };
  });

  res.json({ success: true, data: formatted });
}));

// GET /api/articles/:id - Obtener un artículo por ID (Multi-Idioma)
router.get("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    "SELECT id, title, slug, excerpt, content, cover_image, status, views_count, created_at FROM articles WHERE id = ? LIMIT 1",
    [id]
  );
  const arr = rows as any[];
  if (!arr || arr.length === 0) {
    res.status(404).json({ success: false, error: "Artículo no encontrado" });
    return;
  }
  const r = arr[0];
  const rawCover = r.cover_image ? parseText(r.cover_image) : "";
  const titleObj = parseMultiLang(r.title, 'Nuevo Artículo');
  const slugObj = parseMultiLang(r.slug, 'articulo-' + r.id);
  const excerptObj = parseMultiLang(r.excerpt, '');
  const contentObj = parseMultiLang(r.content, '');

  res.json({
    success: true,
    data: {
      id: String(r.id),
      code: "[ ART-" + String(r.id).padStart(3, '0') + " ]",
      title: titleObj.es,
      titles: titleObj,
      slug: slugObj.es,
      slugs: slugObj,
      excerpt: excerptObj.es,
      excerpts: excerptObj,
      content: contentObj.es,
      contents: contentObj,
      coverImage: rawCover || '',
      cover_image: rawCover || '',
      category: 'TECNOLOGÍA',
      author: 'Equipo TLUX',
      date: r.created_at ? String(r.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      views: (r.views_count || 0) + 'k',
      status: (r.status === 'published' || r.status === 'PUBLICADO') ? 'PUBLICADO' : 'BORRADOR',
      languages: ['ES', 'EN', 'PT'],
    },
  });
}));

// POST /api/articles - Crear nuevo artículo Multi-Idioma
router.post(
  "/",
  authenticate,
  requirePermission("article.create"),
  asyncHandler(async (req, res) => {
    const { title, titles, slug, slugs, excerpt, excerpts, content, contents, category, status, author, coverImage, cover_image } = req.body;

    const baseTitleObj = titles || parseMultiLang(title, 'Nuevo Artículo');
    const baseExcerptObj = excerpts || parseMultiLang(excerpt, '');
    const baseContentObj = contents || parseMultiLang(content, '');

    const esTitle = baseTitleObj.es || 'Nuevo Artículo';
    const esExcerpt = baseExcerptObj.es || '';
    const esContent = baseContentObj.es || '';

    // Autotraducir automáticamente EN y PT si no fueron especificados por el usuario
    const [enTitle, ptTitle, enExcerpt, ptExcerpt, rawEnContent, rawPtContent] = await Promise.all([
      autoTranslateIfSame(esTitle, baseTitleObj.en, 'en'),
      autoTranslateIfSame(esTitle, baseTitleObj.pt, 'pt'),
      autoTranslateIfSame(esExcerpt, baseExcerptObj.en, 'en'),
      autoTranslateIfSame(esExcerpt, baseExcerptObj.pt, 'pt'),
      autoTranslateHtmlIfSame(esContent, baseContentObj.en, 'en'),
      autoTranslateHtmlIfSame(esContent, baseContentObj.pt, 'pt'),
    ]);

    const titleObj = { es: esTitle, en: enTitle, pt: ptTitle };
    const excerptObj = { es: esExcerpt, en: enExcerpt, pt: ptExcerpt };

    const esSlug = (slugs?.es || slug || esTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
    const enSlug = (slugs?.en && slugs.en !== esSlug ? slugs.en : enTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
    const ptSlug = (slugs?.pt && slugs.pt !== esSlug ? slugs.pt : ptTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
    const slugObj = { es: esSlug, en: enSlug, pt: ptSlug };

    const dbStatus = (status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published';
    const rawImgUrl = coverImage || cover_image || '';

    // Subir imagen de portada a Cloudinary
    const cloudinaryCoverUrl = await uploadImageUrlToCloudinary(rawImgUrl, "corptlux/articles/covers");

    // Procesar imágenes de cada idioma hacia Cloudinary
    const processedContentEs = await processHtmlImagesWithCloudinary(esContent, "corptlux/articles/content");
    const processedContentEn = await processHtmlImagesWithCloudinary(rawEnContent, "corptlux/articles/content");
    const processedContentPt = await processHtmlImagesWithCloudinary(rawPtContent, "corptlux/articles/content");

    const finalContentObj = {
      es: processedContentEs,
      en: processedContentEn,
      pt: processedContentPt,
    };

    const [result] = await pool.query(
      "INSERT INTO articles (category_id, author_id, created_by, title, slug, excerpt, content, cover_image, status, published_at) VALUES (1, 1, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
      [
        JSON.stringify(titleObj),
        JSON.stringify(slugObj),
        JSON.stringify(excerptObj),
        JSON.stringify(finalContentObj),
        JSON.stringify({ es: cloudinaryCoverUrl, en: cloudinaryCoverUrl, pt: cloudinaryCoverUrl }),
        dbStatus
      ]
    );

    const insertId = (result as { insertId: number }).insertId;

    res.status(201).json({
      success: true,
      data: {
        id: String(insertId),
        code: "[ ART-" + String(insertId).padStart(3, '0') + " ]",
        title: titleObj.es,
        titles: titleObj,
        slug: slugObj.es,
        slugs: slugObj,
        excerpt: excerptObj.es,
        excerpts: excerptObj,
        content: processedContentEs,
        contents: finalContentObj,
        coverImage: cloudinaryCoverUrl,
        cover_image: cloudinaryCoverUrl,
        category: category || 'TECNOLOGÍA',
        author: author || 'Equipo TLUX',
        date: new Date().toISOString().split('T')[0],
        views: '0k',
        status: dbStatus === 'published' ? 'PUBLICADO' : 'BORRADOR',
        languages: ['ES', 'EN', 'PT'],
      },
    });
  })
);

// PUT & PATCH /api/articles/:id - Actualizar artículo Multi-Idioma
const handleUpdate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, titles, slug, slugs, excerpt, excerpts, content, contents, category, status, author, coverImage, cover_image } = req.body;

  const [existingRows] = await pool.query("SELECT * FROM articles WHERE id = ? LIMIT 1", [id]);
  const arr = existingRows as any[];
  if (!arr || arr.length === 0) {
    res.status(404).json({ success: false, error: "Artículo no encontrado para actualizar" });
    return;
  }
  const current = arr[0];

  const currentTitleObj = parseMultiLang(current.title, 'Nuevo Artículo');
  const currentSlugObj = parseMultiLang(current.slug, 'articulo-' + id);
  const currentExcerptObj = parseMultiLang(current.excerpt, '');
  const currentContentObj = parseMultiLang(current.content, '');

  const baseTitleObj = titles || (title ? parseMultiLang(title) : currentTitleObj);
  const baseExcerptObj = excerpts || (excerpt ? parseMultiLang(excerpt) : currentExcerptObj);
  const baseContentObj = contents || (content ? parseMultiLang(content) : currentContentObj);

  const esTitle = baseTitleObj.es || 'Nuevo Artículo';
  const esExcerpt = baseExcerptObj.es || '';
  const esContent = baseContentObj.es || '';

  const [enTitle, ptTitle, enExcerpt, ptExcerpt, rawEnContent, rawPtContent] = await Promise.all([
    autoTranslateIfSame(esTitle, baseTitleObj.en, 'en'),
    autoTranslateIfSame(esTitle, baseTitleObj.pt, 'pt'),
    autoTranslateIfSame(esExcerpt, baseExcerptObj.en, 'en'),
    autoTranslateIfSame(esExcerpt, baseExcerptObj.pt, 'pt'),
    autoTranslateHtmlIfSame(esContent, baseContentObj.en, 'en'),
    autoTranslateHtmlIfSame(esContent, baseContentObj.pt, 'pt'),
  ]);

  const titleObj = { es: esTitle, en: enTitle, pt: ptTitle };
  const excerptObj = { es: esExcerpt, en: enExcerpt, pt: ptExcerpt };

  const esSlug = (slugs?.es || slug || currentSlugObj.es || esTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
  const enSlug = (slugs?.en && slugs.en !== esSlug ? slugs.en : enTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
  const ptSlug = (slugs?.pt && slugs.pt !== esSlug ? slugs.pt : ptTitle.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-')).replace('/insights/', '');
  const slugObj = { es: esSlug, en: enSlug, pt: ptSlug };

  const rawImgUrl = (coverImage || cover_image) !== undefined ? (coverImage || cover_image) : (parseText(current.cover_image) || '');
  const dbStatus = status ? ((status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published') : current.status;

  const cloudinaryCoverUrl = await uploadImageUrlToCloudinary(rawImgUrl, "corptlux/articles/covers");

  const processedContentEs = await processHtmlImagesWithCloudinary(esContent, "corptlux/articles/content");
  const processedContentEn = await processHtmlImagesWithCloudinary(rawEnContent, "corptlux/articles/content");
  const processedContentPt = await processHtmlImagesWithCloudinary(rawPtContent, "corptlux/articles/content");

  const finalContentObj = {
    es: processedContentEs,
    en: processedContentEn,
    pt: processedContentPt,
  };

  await pool.query(
    "UPDATE articles SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?",
    [
      JSON.stringify(titleObj),
      JSON.stringify(slugObj),
      JSON.stringify(excerptObj),
      JSON.stringify(finalContentObj),
      JSON.stringify({ es: cloudinaryCoverUrl, en: cloudinaryCoverUrl, pt: cloudinaryCoverUrl }),
      dbStatus,
      id
    ]
  );

  res.json({
    success: true,
    message: "Artículo actualizado correctamente en MySQL",
    data: {
      id: String(id),
      code: "[ ART-" + String(id).padStart(3, '0') + " ]",
      title: titleObj.es,
      titles: titleObj,
      slug: slugObj.es,
      slugs: slugObj,
      excerpt: excerptObj.es,
      excerpts: excerptObj,
      content: processedContentEs,
      contents: finalContentObj,
      coverImage: cloudinaryCoverUrl,
      cover_image: cloudinaryCoverUrl,
      category: category || 'TECNOLOGÍA',
      author: author || 'Equipo TLUX',
      status: dbStatus === 'published' ? 'PUBLICADO' : 'BORRADOR',
    },
  });
});

router.put("/:id", authenticate, requirePermission("article.update"), handleUpdate);
router.patch("/:id", authenticate, requirePermission("article.update"), handleUpdate);

// PATCH /api/articles/:id/status
router.patch(
  "/:id/status",
  authenticate,
  requirePermission("article.update"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const dbStatus = (status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published';

    await pool.query("UPDATE articles SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?", [dbStatus, id]);
    res.json({ success: true, message: "Estado actualizado en MySQL" });
  })
);

// DELETE /api/articles/:id
router.delete(
  "/:id",
  authenticate,
  requirePermission("article.delete"),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    try {
      await pool.query("DELETE FROM article_tags WHERE article_id = ?", [id]);
      await pool.query("DELETE FROM article_media WHERE article_id = ?", [id]);
      await pool.query("DELETE FROM article_revisions WHERE article_id = ?", [id]);
      const [delRes]: any = await pool.query("DELETE FROM articles WHERE id = ?", [id]);
      res.json({
        success: true,
        message: "Artículo eliminado de MySQL",
        affectedRows: delRes?.affectedRows
      });
    } catch (err: any) {
      console.error("[ARTICLE_DELETE] Error al eliminar artículo:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Error al eliminar artículo"
      });
    }
  })
);

export default router;
