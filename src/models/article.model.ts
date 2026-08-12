import { pool } from "../config/db";
import { ApiError } from "../utils/ApiError";
import { jsonColumns } from "../utils/json";
import { setArticleTags } from "./articleTag.model";
import { setArticleMedia } from "./articleMedia.model";

const JSON_COLS = [
  "title",
  "excerpt",
  "content",
  "slug",
  "meta_title",
  "meta_description",
];

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export interface Article {
  id: number;
  category_id: number;
  author_id: number;
  cover_media_id: number | null;
  title: unknown;
  excerpt: unknown;
  content: unknown;
  slug: unknown;
  meta_title: unknown;
  meta_description: unknown;
  status: ArticleStatus;
  published_at: Date | string | null;
  reading_time_min: number | null;
  views_count: number;
  is_featured: boolean;
  featured_position: number | null;
  created_by: number;
  updated_by: number | null;
  slug_es: string | null;
  slug_en: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export interface ArticleInput {
  category_id: number;
  author_id: number;
  cover_media_id?: number | null;
  title: unknown;
  excerpt?: unknown;
  content: unknown;
  slug: unknown;
  meta_title?: unknown;
  meta_description?: unknown;
  status?: ArticleStatus;
  published_at?: Date | string | null;
  reading_time_min?: number | null;
  is_featured?: boolean;
  featured_position?: number | null;
  created_by: number;
  updated_by?: number | null;
  tag_ids?: number[];
  media_ids?: number[];
}

export type ArticleUpdateInput = Partial<Omit<ArticleInput, "created_by">> & { updated_by?: number | null };

interface ArticleRow extends Omit<Article, "is_featured"> {
  is_featured: number;
}

function mapRow(row: ArticleRow): Article {
  const mapped = jsonColumns(row as unknown as Record<string, unknown>, JSON_COLS);
  return { ...(mapped as unknown as Article), is_featured: !!mapped.is_featured };
}

export async function findAll(
  filters: { status?: ArticleStatus; categoryId?: number } = {},
  page = 1,
  limit = 20
): Promise<{ rows: Article[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (filters?.status) {
    conditions.push("a.status = ?");
    params.push(filters.status);
  }
  if (filters?.categoryId) {
    conditions.push("a.category_id = ?");
    params.push(filters.categoryId);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM articles a ${where}`, params);
  const total = (countRows as { total: number }[])[0].total;
  const offset = (page - 1) * limit;
  const [rows] = await pool.query(
    `SELECT a.* FROM articles a ${where} ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { rows: (rows as ArticleRow[]).map(mapRow), total };
}

export async function findById(id: number): Promise<Article | undefined> {
  const [rows] = await pool.query(
    "SELECT * FROM articles WHERE id = ? LIMIT 1",
    [id]
  );
  return (rows as ArticleRow[])[0] ? mapRow((rows as ArticleRow[])[0]) : undefined;
}

export async function findTags(articleId: number): Promise<{ id: number; name: unknown; slug: unknown }[]> {
  return import("./articleTag.model").then((m) => m.findByArticleId(articleId));
}

export async function findMedia(articleId: number): Promise<{ media_id: number; type: string; position: number; caption: unknown }[]> {
  return import("./articleMedia.model").then((m) => m.findByArticleId(articleId));
}

export async function create(data: ArticleInput): Promise<number> {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.query(
      `INSERT INTO articles
         (category_id, author_id, cover_media_id, title, excerpt, content, slug, meta_title, meta_description,
          status, published_at, reading_time_min, is_featured, featured_position, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.category_id,
        data.author_id,
        data.cover_media_id ?? null,
        JSON.stringify(data.title),
        data.excerpt === undefined ? null : JSON.stringify(data.excerpt),
        JSON.stringify(data.content),
        JSON.stringify(data.slug),
        data.meta_title === undefined ? null : JSON.stringify(data.meta_title),
        data.meta_description === undefined ? null : JSON.stringify(data.meta_description),
        data.status ?? "draft",
        data.published_at ?? null,
        data.reading_time_min ?? null,
        data.is_featured ? 1 : 0,
        data.featured_position ?? null,
        data.created_by,
      ]
    );
    const articleId = (result as { insertId: number }).insertId;

    await connection.query(
      `INSERT INTO article_revisions
         (article_id, version, title, excerpt, content, slug, meta_title, meta_description,
          status, published_at, reading_time_min, is_featured, featured_position, created_by)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        articleId,
        JSON.stringify(data.title),
        data.excerpt === undefined ? null : JSON.stringify(data.excerpt),
        JSON.stringify(data.content),
        JSON.stringify(data.slug),
        data.meta_title === undefined ? null : JSON.stringify(data.meta_title),
        data.meta_description === undefined ? null : JSON.stringify(data.meta_description),
        data.status ?? "draft",
        data.published_at ?? null,
        data.reading_time_min ?? null,
        data.is_featured ? 1 : 0,
        data.featured_position ?? null,
        data.created_by,
      ]
    );

    if (data.tag_ids?.length) {
      await setArticleTags(articleId, data.tag_ids, connection);
    }
    if (data.media_ids?.length) {
      await setArticleMedia(articleId, data.media_ids, connection);
    }
    await connection.commit();
    return articleId;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function update(id: number, data: ArticleUpdateInput): Promise<void> {
  const connection = await pool.getConnection();
  try {
    const current = await findById(id);
    if (!current) {
      throw new ApiError(404, "Artículo no encontrado");
    }
    await connection.beginTransaction();
    await connection.query(
      `UPDATE articles SET
         category_id = COALESCE(?, category_id),
         author_id = COALESCE(?, author_id),
         cover_media_id = ?,
         title = ?,
         excerpt = ?,
         content = ?,
         slug = ?,
         meta_title = ?,
         meta_description = ?,
         status = COALESCE(?, status),
         published_at = ?,
         reading_time_min = COALESCE(?, reading_time_min),
         is_featured = COALESCE(?, is_featured),
         featured_position = COALESCE(?, featured_position),
         updated_by = ?
       WHERE id = ?`,
      [
        data.category_id ?? null,
        data.author_id ?? null,
        data.cover_media_id === undefined ? current.cover_media_id : data.cover_media_id,
        data.title === undefined ? JSON.stringify(current.title) : JSON.stringify(data.title),
        data.excerpt === undefined
          ? JSON.stringify(current.excerpt)
          : data.excerpt === null
            ? null
            : JSON.stringify(data.excerpt),
        data.content === undefined ? JSON.stringify(current.content) : JSON.stringify(data.content),
        data.slug === undefined ? JSON.stringify(current.slug) : JSON.stringify(data.slug),
        data.meta_title === undefined
          ? JSON.stringify(current.meta_title)
          : data.meta_title === null
            ? null
            : JSON.stringify(data.meta_title),
        data.meta_description === undefined
          ? JSON.stringify(current.meta_description)
          : data.meta_description === null
            ? null
            : JSON.stringify(data.meta_description),
        data.status ?? null,
        data.published_at === undefined ? current.published_at : data.published_at,
        data.reading_time_min ?? null,
        data.is_featured === undefined ? (current.is_featured ? 1 : 0) : data.is_featured ? 1 : 0,
        data.featured_position ?? null,
        data.updated_by ?? null,
        id,
      ]
    );

    const revisionCreator = data.updated_by ?? current.created_by;

    const [revRows] = await connection.query(
      "SELECT COALESCE(MAX(version), 0) + 1 AS v FROM article_revisions WHERE article_id = ?",
      [id]
    );
    const version = (revRows as { v: number }[])[0].v;
    await connection.query(
      `INSERT INTO article_revisions
         (article_id, version, title, excerpt, content, slug, meta_title, meta_description,
          status, published_at, reading_time_min, is_featured, featured_position, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        version,
        data.title === undefined ? JSON.stringify(current.title) : JSON.stringify(data.title),
        data.excerpt === undefined
          ? JSON.stringify(current.excerpt)
          : data.excerpt === null
            ? null
            : JSON.stringify(data.excerpt),
        data.content === undefined ? JSON.stringify(current.content) : JSON.stringify(data.content),
        data.slug === undefined ? JSON.stringify(current.slug) : JSON.stringify(data.slug),
        data.meta_title === undefined
          ? JSON.stringify(current.meta_title)
          : data.meta_title === null
            ? null
            : JSON.stringify(data.meta_title),
        data.meta_description === undefined
          ? JSON.stringify(current.meta_description)
          : data.meta_description === null
            ? null
            : JSON.stringify(data.meta_description),
        data.status ?? current.status,
        data.published_at === undefined ? current.published_at : data.published_at,
        data.reading_time_min ?? current.reading_time_min,
        data.is_featured === undefined ? (current.is_featured ? 1 : 0) : data.is_featured ? 1 : 0,
        data.featured_position ?? current.featured_position,
        revisionCreator,
      ]
    );

    if (data.tag_ids) {
      await setArticleTags(id, data.tag_ids, connection);
    }
    if (data.media_ids) {
      await setArticleMedia(id, data.media_ids, connection);
    }
    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}

export async function incrementViews(id: number): Promise<void> {
  await pool.query("UPDATE articles SET views_count = views_count + 1 WHERE id = ?", [id]);
}

export async function remove(id: number): Promise<void> {
  await pool.query("DELETE FROM articles WHERE id = ?", [id]);
}
