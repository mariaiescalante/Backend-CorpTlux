import { Router } from "express";
import { pool } from "../config/db";
import { asyncHandler } from "../utils/asyncHandler";
import { uploadImageUrlToCloudinary, processHtmlImagesWithCloudinary } from "../services/cloudinaryService";

const router = Router();

// Asegurar la columna cover_image en la tabla articles de MySQL
async function ensureCoverImageColumn() {
  try {
    await pool.query("ALTER TABLE articles ADD COLUMN cover_image TEXT NULL");
  } catch (err) {}
}
ensureCoverImageColumn().catch(() => {});

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

// GET /api/articles - Listar todos los artículos guardados en MySQL
router.get("/", asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT id, title, slug, excerpt, content, cover_image, status, views_count, created_at FROM articles ORDER BY id DESC"
  );

  const formatted = (rows as any[]).map((r) => {
    const rawCover = r.cover_image ? parseText(r.cover_image) : "";
    return {
      id: String(r.id),
      code: "[ ART-" + String(r.id).padStart(3, '0') + " ]",
      title: parseText(r.title),
      slug: parseText(r.slug) || "articulo-" + r.id,
      excerpt: parseText(r.excerpt) || '',
      content: parseText(r.content) || '',
      coverImage: rawCover || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
      cover_image: rawCover || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
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

// GET /api/articles/:id - Obtener un artículo por ID
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

  res.json({
    success: true,
    data: {
      id: String(r.id),
      code: "[ ART-" + String(r.id).padStart(3, '0') + " ]",
      title: parseText(r.title),
      slug: parseText(r.slug) || "articulo-" + r.id,
      excerpt: parseText(r.excerpt) || '',
      content: parseText(r.content) || '',
      coverImage: rawCover || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
      cover_image: rawCover || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop',
      category: 'TECNOLOGÍA',
      author: 'Equipo TLUX',
      date: r.created_at ? String(r.created_at).split('T')[0] : new Date().toISOString().split('T')[0],
      views: (r.views_count || 0) + 'k',
      status: (r.status === 'published' || r.status === 'PUBLICADO') ? 'PUBLICADO' : 'BORRADOR',
      languages: ['ES', 'EN', 'PT'],
    },
  });
}));

// POST /api/articles - Crear nuevo artículo procesando automáticamente imágenes hacia Cloudinary
router.post("/", asyncHandler(async (req, res) => {
  const { title, slug, excerpt, content, category, status, author, coverImage, cover_image } = req.body;

  if (!title) {
    res.status(400).json({ success: false, error: "El título es obligatorio" });
    return;
  }

  const titleStr = typeof title === "string" ? title : (title.es || title.en || "Nuevo Artículo");
  const generatedSlug = slug || titleStr.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
  const dbStatus = (status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published';
  const rawImgUrl = coverImage || cover_image || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop';

  // Subir imagen de portada a Cloudinary en segundo plano
  const cloudinaryCoverUrl = await uploadImageUrlToCloudinary(rawImgUrl, "corptlux/articles/covers");
  // Procesar imágenes internas del cuerpo WYSIWYG hacia Cloudinary
  const processedContent = await processHtmlImagesWithCloudinary(content || '', "corptlux/articles/content");

  const [result] = await pool.query(
    `INSERT INTO articles (category_id, author_id, created_by, title, slug, excerpt, content, cover_image, status, published_at) 
     VALUES (1, 1, 1, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      JSON.stringify({ es: titleStr, en: titleStr }),
      JSON.stringify({ es: generatedSlug, en: generatedSlug }),
      JSON.stringify({ es: excerpt || '', en: excerpt || '' }),
      JSON.stringify({ es: processedContent, en: processedContent }),
      JSON.stringify({ es: cloudinaryCoverUrl, en: cloudinaryCoverUrl }),
      dbStatus
    ]
  );

  const insertId = (result as { insertId: number }).insertId;

  res.status(201).json({
    success: true,
    data: {
      id: String(insertId),
      code: "[ ART-" + String(insertId).padStart(3, '0') + " ]",
      title: titleStr,
      slug: generatedSlug,
      excerpt: excerpt || '',
      content: processedContent,
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
}));

// PUT & PATCH /api/articles/:id - Actualizar artículo procesando imágenes hacia Cloudinary
const handleUpdate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, slug, excerpt, content, category, status, author, coverImage, cover_image } = req.body;

  const [existingRows] = await pool.query("SELECT * FROM articles WHERE id = ? LIMIT 1", [id]);
  const arr = existingRows as any[];
  if (!arr || arr.length === 0) {
    res.status(404).json({ success: false, error: "Artículo no encontrado para actualizar" });
    return;
  }
  const current = arr[0];

  const titleStr = title !== undefined ? (typeof title === "string" ? title : (title.es || title.en || "")) : parseText(current.title);
  const slugStr = slug !== undefined ? (typeof slug === "string" ? slug : (slug.es || slug.en || "")) : parseText(current.slug);
  const excerptStr = excerpt !== undefined ? (typeof excerpt === "string" ? excerpt : (excerpt.es || excerpt.en || "")) : parseText(current.excerpt);
  const rawContent = content !== undefined ? (typeof content === "string" ? content : (content.es || content.en || "")) : parseText(current.content);
  const rawImgUrl = (coverImage || cover_image) !== undefined ? (coverImage || cover_image) : (parseText(current.cover_image) || 'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1200&auto=format&fit=crop');
  const dbStatus = status ? ((status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published') : current.status;

  // Procesar portada en Cloudinary
  const cloudinaryCoverUrl = await uploadImageUrlToCloudinary(rawImgUrl, "corptlux/articles/covers");
  // Procesar imágenes internas HTML en Cloudinary
  const processedContent = await processHtmlImagesWithCloudinary(rawContent, "corptlux/articles/content");

  await pool.query(
    `UPDATE articles SET 
       title = ?, 
       slug = ?, 
       excerpt = ?, 
       content = ?, 
       cover_image = ?, 
       status = ?, 
       published_at = CURRENT_TIMESTAMP 
     WHERE id = ?`,
    [
      JSON.stringify({ es: titleStr, en: titleStr }),
      JSON.stringify({ es: slugStr, en: slugStr }),
      JSON.stringify({ es: excerptStr, en: excerptStr }),
      JSON.stringify({ es: processedContent, en: processedContent }),
      JSON.stringify({ es: cloudinaryCoverUrl, en: cloudinaryCoverUrl }),
      dbStatus,
      id
    ]
  );

  res.json({
    success: true,
    message: "Artículo actualizado correctamente en MySQL y Cloudinary",
    data: {
      id: String(id),
      code: "[ ART-" + String(id).padStart(3, '0') + " ]",
      title: titleStr,
      slug: slugStr,
      excerpt: excerptStr,
      content: processedContent,
      coverImage: cloudinaryCoverUrl,
      cover_image: cloudinaryCoverUrl,
      category: category || 'TECNOLOGÍA',
      author: author || 'Equipo TLUX',
      status: dbStatus === 'published' ? 'PUBLICADO' : 'BORRADOR',
    },
  });
});

router.put("/:id", handleUpdate);
router.patch("/:id", handleUpdate);

// PATCH /api/articles/:id/status
router.patch("/:id/status", asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const dbStatus = (status === 'BORRADOR' || status === 'draft') ? 'draft' : 'published';

  await pool.query("UPDATE articles SET status = ?, published_at = CURRENT_TIMESTAMP WHERE id = ?", [dbStatus, id]);
  res.json({ success: true, message: "Estado actualizado en MySQL" });
}));

// DELETE /api/articles/:id
router.delete("/:id", asyncHandler(async (req, res) => {
  const { id } = req.params;
  await pool.query("DELETE FROM articles WHERE id = ?", [id]);
  res.json({ success: true, message: "Artículo eliminado de MySQL" });
}));

export default router;
