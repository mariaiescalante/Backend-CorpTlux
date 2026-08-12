import nodemailer from "nodemailer";
import { config } from "../config";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  const { smtp } = config.email;
  if (!smtp.host) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: smtp.user
        ? { user: smtp.user, pass: smtp.password }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  const transport = config.email.transport;

  if (transport === "log" || !transport) {
    console.log(`[EMAIL:${transport}] -> ${to}`);
    console.log(`  Asunto: ${subject}`);
    console.log(`  Contenido: ${html}`);
    return;
  }

  if (transport === "smtp") {
    const t = getTransporter();
    if (!t) {
      throw new Error("SMTP_HOST no configurado");
    }
    await t.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });
    return;
  }

  throw new Error(`Transporte de email no soportado: ${transport}`);
}
