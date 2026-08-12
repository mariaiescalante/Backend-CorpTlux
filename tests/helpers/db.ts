import { pool } from "../../src/config/db";
import { hashPassword } from "../../src/utils/password";

const TABLES = [
  "activity_log",
  "admin_sessions",
  "admin_users",
  "article_media",
  "article_revisions",
  "article_tags",
  "articles",
  "categories",
  "faq_categories",
  "faqs",
  "media",
  "password_reset_tokens",
  "permissions",
  "role_permissions",
  "roles",
  "tags",
];

export const PERMISSIONS = [
  "articles.view", "articles.create", "articles.edit", "articles.delete", "articles.publish",
  "categories.view", "categories.manage",
  "tags.view", "tags.manage",
  "media.view", "media.manage",
  "faq.view", "faq.create", "faq.edit", "faq.delete",
  "users.view", "users.create", "users.edit", "users.delete",
  "roles.manage",
  "activity_log.view",
  "admin_user.view", "admin_user.create", "admin_user.update", "admin_user.delete",
  "role.view", "role.create", "role.update", "role.delete",
  "permission.view",
  "category.create", "category.update", "category.delete",
  "tag.create", "tag.update", "tag.delete",
  "article.view", "article.create", "article.update", "article.delete",
  "faq.update",
  "media.upload", "media.update", "media.delete",
];

export const ADMIN_EMAIL = "admin@corptlux.com";
export const ADMIN_PASSWORD = "admin123";

let adminHash: string | null = null;

export async function resetDb(): Promise<void> {
  if (!adminHash) {
    adminHash = await hashPassword(ADMIN_PASSWORD);
  }

  const connection = await pool.getConnection();
  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    for (const table of TABLES) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
    }

    const [roleResult] = await connection.query(
      "INSERT INTO roles (name, description) VALUES (?, ?)",
      ["superadmin", "Administrador con todos los permisos"]
    );
    const superadminRoleId = (roleResult as { insertId: number }).insertId;

    for (const permission of PERMISSIONS) {
      const [permResult] = await connection.query(
        "INSERT INTO permissions (name, description) VALUES (?, NULL)",
        [permission]
      );
      const permissionId = (permResult as { insertId: number }).insertId;
      await connection.query(
        "INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)",
        [superadminRoleId, permissionId]
      );
    }

    await connection.query(
      "INSERT INTO admin_users (role_id, name, email, password_hash, status) VALUES (?, ?, ?, ?, 'active')",
      [superadminRoleId, "Administrador Test", ADMIN_EMAIL, adminHash]
    );
  } finally {
    connection.release();
  }
}

export async function closeDb(): Promise<void> {
  await pool.end();
}
