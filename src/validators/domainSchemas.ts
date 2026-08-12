import { z } from "zod";
import { jsonField, nullableJsonField, articleStatusEnum, statusEnum } from "./commonSchemas";

export const loginSchema = z
  .object({
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  })
  .strict();

export const passwordResetRequestSchema = z
  .object({
    email: z.string().email("Email inválido"),
  })
  .strict();

export const passwordResetSchema = z
  .object({
    token: z.string().min(1, "Token requerido"),
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Contraseña actual requerida"),
    newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña"),
  })
  .strict()
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas nuevas no coinciden",
    path: ["confirmPassword"],
  });

export const createAdminUserSchema = z
  .object({
    role_id: z.number().int().positive(),
    name: z.string().min(1).max(150),
    email: z.string().email(),
    password_hash: z.string().min(6).max(255),
    avatar_media_id: z.number().int().positive().nullable().optional(),
    status: statusEnum.optional(),
  })
  .strict();

export const updateAdminUserSchema = createAdminUserSchema.partial();

export const createRoleSchema = z
  .object({
    name: z.string().min(1).max(50),
    description: z.string().max(255).nullable().optional(),
  })
  .strict();

export const updateRoleSchema = createRoleSchema.partial();

export const setRolePermissionsSchema = z
  .object({
    permissionIds: z.array(z.number().int().positive()).min(0),
  })
  .strict();

export const createCategorySchema = z
  .object({
    parent_id: z.number().int().positive().nullable().optional(),
    cover_media_id: z.number().int().positive().nullable().optional(),
    name: jsonField,
    description: nullableJsonField.optional(),
    slug: jsonField,
    meta_title: nullableJsonField.optional(),
    meta_description: nullableJsonField.optional(),
    position: z.number().int().nonnegative().optional(),
    status: statusEnum.optional(),
  })
  .strict();

export const updateCategorySchema = createCategorySchema.partial();

export const createTagSchema = z
  .object({
    name: jsonField,
    slug: jsonField,
  })
  .strict();

export const updateTagSchema = createTagSchema.partial();

export const createFaqCategorySchema = z
  .object({
    name: jsonField,
    description: nullableJsonField.optional(),
    position: z.number().int().nonnegative().optional(),
    status: statusEnum.optional(),
  })
  .strict();

export const updateFaqCategorySchema = createFaqCategorySchema.partial();

export const createFaqSchema = z
  .object({
    faq_category_id: z.number().int().positive(),
    question: jsonField,
    answer: jsonField,
    position: z.number().int().nonnegative().optional(),
    status: statusEnum.optional(),
  })
  .strict();

export const updateFaqSchema = createFaqSchema.partial();

export const createMediaSchema = z
  .object({
    provider: z.enum(["cloudinary", "s3", "local", "other"]).optional(),
    public_id: z.string().min(1).max(255),
    url: z.string().url("URL inválida").max(1000),
    resource_type: z.string().max(50).nullable().optional(),
    mime_type: z.string().max(100).nullable().optional(),
    file_extension: z.string().max(20).nullable().optional(),
    width: z.number().int().positive().nullable().optional(),
    height: z.number().int().positive().nullable().optional(),
    size_bytes: z.number().int().nonnegative().nullable().optional(),
    alt_text: nullableJsonField.optional(),
  })
  .strict();

export const updateMediaSchema = createMediaSchema.partial();

export const createArticleSchema = z
  .object({
    category_id: z.number().int().positive(),
    author_id: z.number().int().positive().optional(),
    cover_media_id: z.number().int().positive().nullable().optional(),
    title: jsonField,
    excerpt: nullableJsonField.optional(),
    content: jsonField,
    slug: jsonField,
    meta_title: nullableJsonField.optional(),
    meta_description: nullableJsonField.optional(),
    status: articleStatusEnum.optional(),
    published_at: z
      .string()
      .datetime({ offset: true })
      .nullable()
      .optional(),
    reading_time_min: z.number().int().positive().nullable().optional(),
    is_featured: z.boolean().optional(),
    featured_position: z.number().int().positive().nullable().optional(),
    tag_ids: z.array(z.number().int().positive()).optional(),
    media_ids: z.array(z.number().int().positive()).optional(),
  })
  .strict();

export const updateArticleSchema = createArticleSchema.partial();
