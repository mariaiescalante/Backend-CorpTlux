import crypto from "crypto";
import { config } from "../config";
import { sendEmail } from "./emailService";
import * as passwordResetTokenModel from "../models/passwordResetToken.model";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function resetUrl(token: string): string {
  return `${config.appUrl}/reset-password?token=${token}`;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const user = await import("../models/adminUser.model").then((m) => m.findByEmail(email));
  if (!user) {
    return;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await passwordResetTokenModel.create(user.id, sha256(rawToken), expiresAt);

  const url = resetUrl(rawToken);
  const html = `
    <h2>Restablecer contraseña</h2>
    <p>Hola ${user.name},</p>
    <p>Recibimos una solicitud para restablecer tu contraseña. El enlace es válido por 1 hora.</p>
    <p><a href="${url}">Restablecer contraseña</a></p>
    <p>Si no solicitaste esto, ignora este correo.</p>
  `;

  await sendEmail({
    to: email,
    subject: "Restablecer contraseña - CorpTlux",
    html,
  });
}
