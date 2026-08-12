import { AdminUser } from "../models/adminUser.model";

export function toSafeUser(user: AdminUser) {
  return {
    id: user.id,
    role_id: user.role_id,
    name: user.name,
    email: user.email,
    status: user.status,
    avatar_media_id: user.avatar_media_id,
    last_login_at: user.last_login_at,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
