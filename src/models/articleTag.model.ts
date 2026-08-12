import { pool } from "../config/db";
import { jsonColumns } from "../utils/json";

export interface ArticleTag {
  article_id: number;
  tag_id: number;
}

export interface ArticleTagDetail {
  id: number;
  name: unknown;
  slug: unknown;
}

export async function findByArticleId(articleId: number): Promise<ArticleTagDetail[]> {
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.slug FROM tags t
     JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = ?
     ORDER BY t.id`,
    [articleId]
  );
  return (rows as ArticleTagDetail[]).map((r) =>
    jsonColumns(r as unknown as Record<string, unknown>, ["name", "slug"]) as unknown as ArticleTagDetail
  );
}

export async function findByTagId(tagId: number): Promise<ArticleTag[]> {
  const [rows] = await pool.query(
    "SELECT * FROM article_tags WHERE tag_id = ?",
    [tagId]
  );
  return rows as ArticleTag[];
}

export async function setArticleTags(articleId: number, tagIds: number[], connection?: {
  query: (sql: string, params: unknown[]) => Promise<unknown>;
}): Promise<void> {
  const exec = async (sql: string, params: unknown[]) =>
    connection ? connection.query(sql, params) : pool.query(sql, params);
  await exec("DELETE FROM article_tags WHERE article_id = ?", [articleId]);
  for (const tagId of tagIds) {
    await exec("INSERT INTO article_tags (article_id, tag_id) VALUES (?, ?)", [articleId, tagId]);
  }
}
