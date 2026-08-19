import dotenv from "dotenv";
import Joi from "joi";

const isTest = process.env.NODE_ENV === "test";
dotenv.config({ path: isTest ? ".env.test" : ".env" });

const envSchema = Joi.object({
  PORT: Joi.number().integer().min(1).max(65535).default(4000),
  NODE_ENV: Joi.string().valid("development", "test", "production").default("development"),
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().integer().min(1).max(65535).default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().allow("").default(""),
  DB_NAME: Joi.string().required(),
  JWT_SECRET: Joi.string().min(16).required().messages({
    "string.min": "JWT_SECRET debe tener al menos 16 caracteres",
    "any.required": "JWT_SECRET es obligatorio",
  }),
  JWT_EXPIRES_IN: Joi.string().default("7d"),
  CORS_ORIGINS: Joi.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: Joi.number().integer().positive().default(900000),
  RATE_LIMIT_MAX: Joi.number().integer().positive().default(100),
  EMAIL_TRANSPORT: Joi.string().valid("log", "smtp", "emailjs").default("log"),
  SMTP_HOST: Joi.string().allow("").default(""),
  SMTP_PORT: Joi.number().integer().min(1).max(65535).default(587),
  SMTP_USER: Joi.string().allow("").default(""),
  SMTP_PASSWORD: Joi.string().allow("").default(""),
  MAIL_FROM: Joi.string().allow("").default("CorpTlux <no-reply@corptlux.com>"),
  APP_URL: Joi.string().uri().default("http://localhost:3000"),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow("").default("dri5k0qio"),
  CLOUDINARY_API_KEY: Joi.string().allow("").default("434763523713664"),
  CLOUDINARY_API_SECRET: Joi.string().allow("").default("FH9mpg-eOCuEW8ui5qJucbea6Ac"),
}).unknown(true);

const { value: env, error } = envSchema.validate(process.env, { abortEarly: false });

if (error) {
  console.error("❌ Configuración de entorno inválida:");
  for (const detail of error.details) {
    console.error(`  - ${detail.message}`);
  }
  process.exit(1);
}

export const config = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  corsOrigins: env.CORS_ORIGINS.split(",")
    .map((o: string) => o.trim())
    .filter(Boolean),
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
  },
  email: {
    transport: env.EMAIL_TRANSPORT,
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    from: env.MAIL_FROM,
  },
  appUrl: env.APP_URL,
  cloudinary: {
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    apiSecret: env.CLOUDINARY_API_SECRET,
  },
};
