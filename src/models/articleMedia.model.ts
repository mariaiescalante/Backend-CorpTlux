import { pool } from "../config/db";
import { jsonColumns } from "../utils/json";

export interface ArticleMedia {
  article_id: number;
  media_id: number;
  type: "gallery" | "inline";
  position: number;
  caption: unknown;
}

export interface ArticleMediaDetail {
  media_id: number;
  type: string;
  position: number;
  caption: unknown;
}

export async function findByArticleId(articleId: number): Promise<ArticleMediaDetail[]> {
  const [rows] = await pool.query(
    `SELECT am.media_id, am.type, am.position, am.caption
     FROM article_media am
     WHERE am.article_id = ?
     ORDER BY am.position, am.media_id`,
    [articleId]
  );
  return (rows as ArticleMediaDetail[]).map((r) =>
    jsonColumns(r as unknown as Record<string, unknown>, ["caption"]) as unknown as ArticleMediaDetail
  );
}

export async function findByMediaId(mediaId: number): Promise<ArticleMedia[]> {
  const [rows] = await pool.query(
    "SELECT * FROM article_media WHERE media_id = ?",
    [mediaId]
  );
  return rows as ArticleMedia[];
}

export async function setArticleMedia(
  articleId: number,
  mediaIds: number[],
  connection?: { query: (sql: string, params: unknown[]) => Promise<unknown> }
): Promise<void> {
  const exec = async (sql: string, params: unknown[]) =>
    connection ? connection.query(sql, params) : pool.query(sql, params);
  await exec("DELETE FROM article_media WHERE article_id = ?", [articleId]);
  for (const mediaId of mediaIds) {
    await exec("INSERT INTO article_media (article_id, media_id, type, position) VALUES (?, ?, 'gallery', 0)", [
      articleId,
      mediaId,
    ]);
  }
}
