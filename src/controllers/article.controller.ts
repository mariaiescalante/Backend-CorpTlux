import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as articleModel from "../models/article.model";
import * as articleRevisionModel from "../models/articleRevision.model";
import * as activityLogModel from "../models/activityLog.model";
import { AuthRequest } from "../middleware/auth";

export const listArticles = asyncHandler(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string, 10) : undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const { rows, total } = await articleModel.findAll(
    { status: status as articleModel.ArticleStatus, categoryId },
    page,
    limit
  );
  res.json({ items: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
});

export const getArticle = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const item = await articleModel.findById(id);
  if (!item) {
    throw new ApiError(404, "Artículo no encontrado");
  }
  const tags = await articleModel.findTags(id);
  const media = await articleModel.findMedia(id);
  res.json({ item: { ...item, tags, media } });
});

export const createArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const body = req.body as articleModel.ArticleInput;
  if (!req.adminUserId) {
    throw new ApiError(401, "No autenticado");
  }
  const articleId = await articleModel.create({ ...body, created_by: req.adminUserId, author_id: body.author_id ?? req.adminUserId });
  await activityLogModel.log(req.adminUserId, "create", "article", articleId, body);
  res.status(201).json({ id: articleId });
});

export const updateArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const body = req.body as articleModel.ArticleUpdateInput;
  if (!req.adminUserId) {
    throw new ApiError(401, "No autenticado");
  }
  await articleModel.update(id, { ...body, updated_by: req.adminUserId });
  await activityLogModel.log(req.adminUserId, "update", "article", id, body);
  res.json({ message: "Artículo actualizado" });
});

export const deleteArticle = asyncHandler(async (req: AuthRequest, res: Response) => {
  const id = parseInt(req.params.id, 10);
  const item = await articleModel.findById(id);
  if (!item) {
    throw new ApiError(404, "Artículo no encontrado");
  }
  await articleModel.remove(id);
  await activityLogModel.log(req.adminUserId!, "delete", "article", id);
  res.json({ message: "Artículo eliminado" });
});

export const listRevisions = asyncHandler(async (req: Request, res: Response) => {
  const articleId = parseInt(req.params.id, 10);
  res.json({ items: await articleRevisionModel.findByArticleId(articleId) });
});

export const incrementViews = asyncHandler(async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  await articleModel.incrementViews(id);
  res.json({ message: "ok" });
});
