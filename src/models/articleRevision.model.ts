import { pool } from "../config/db";
import { jsonColumns } from "../utils/json";

const JSON_COLS = [
  "title",
  "excerpt",
  "content",
  "slug",
  "meta_title",
  "meta_description",
];

export interface ArticleRevision {
  id: number;
  article_id: number;
  version: number;
  title: unknown;
  excerpt: unknown;
  content: unknown;
  slug: unknown;
  meta_title: unknown;
  meta_description: unknown;
  status: string;
  published_at: Date | string | null;
  reading_time_min: number | null;
  is_featured: boolean;
  featured_position: number | null;
  created_by: number;
  created_at: Date | string;
}

export async function findByArticleId(articleId: number): Promise<ArticleRevision[]> {
  const [rows] = await pool.query(
    "SELECT * FROM article_revisions WHERE article_id = ? ORDER BY version DESC",
    [articleId]
  );
  return (rows as ArticleRevision[]).map((r) => {
    const mapped = jsonColumns(r as unknown as Record<string, unknown>, JSON_COLS);
    return { ...(mapped as unknown as ArticleRevision), is_featured: !!mapped.is_featured };
  });
}
