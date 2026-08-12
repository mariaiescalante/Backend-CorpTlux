import { Router } from "express";
import { login, me, logout, requestPasswordReset, resetPassword } from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth";
import { loginRateLimiter, passwordResetRateLimiter } from "../middleware/rateLimit";
import { validate } from "../middleware/validate";
import { loginSchema, passwordResetRequestSchema, passwordResetSchema } from "../validators/domainSchemas";

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión de administrador
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token: { type: string }
 *                 user: { type: object }
 *       401:
 *         description: Credenciales inválidas
 *       429:
 *         description: Demasiados intentos
 */
router.post("/login", loginRateLimiter, validate({ body: loginSchema }), login);

/**
 * @swagger
 * /auth/password-reset/request:
 *   post:
 *     summary: Solicitar restablecimiento de contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Solicitud procesada
 */
router.post("/password-reset/request", passwordResetRateLimiter, validate({ body: passwordResetRequestSchema }), requestPasswordReset);

/**
 * @swagger
 * /auth/password-reset:
 *   post:
 *     summary: Restablecer contraseña con token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Contraseña actualizada
 *       400:
 *         description: Token inválido o expirado
 */
router.post("/password-reset", passwordResetRateLimiter, validate({ body: passwordResetSchema }), resetPassword);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtener usuario autenticado y sus permisos
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Datos del usuario
 *       401:
 *         description: No autenticado
 */
router.get("/me", authenticate, me);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post("/logout", authenticate, logout);

export default router;
