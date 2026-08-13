import request from "supertest";
import crypto from "crypto";
import { app } from "../src/app";
import { resetDb, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers/db";
import { pool } from "../src/config/db";
import { hashPassword } from "../src/utils/password";

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

let token = "";

beforeEach(async () => {
  await resetDb();
}, 15000);

describe("POST /api/auth/login", () => {
  it("devuelve token y usuario sin password_hash", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(res.body.user.password_hash).toBeUndefined();
    token = res.body.token;
  });

  it("rechaza contraseña incorrecta (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "incorrecta" });
    expect(res.status).toBe(401);
  });

  it("rechaza email inexistente (401)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@corptlux.com", password: ADMIN_PASSWORD });
    expect(res.status).toBe(401);
  });

  it("rechaza usuario inactivo (403)", async () => {
    await pool.query(
      "INSERT INTO admin_users (role_id, name, email, password_hash, status) VALUES (1, 'Inactivo', 'inactive@corptlux.com', ?, 'inactive')",
      [await hashPassword(ADMIN_PASSWORD)]
    );
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "inactive@corptlux.com", password: ADMIN_PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe("GET /api/auth/me", () => {
  it("requiere token (401)", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("devuelve usuario y permisos con token válido", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(ADMIN_EMAIL);
    expect(Array.isArray(res.body.permissions)).toBe(true);
    expect(res.body.permissions.length).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/logout", () => {
  it("cierra sesión", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const res = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
  });

  it("revoca la sesión: el token deja de ser válido tras logout", async () => {
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);

    const logout = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(logout.status).toBe(200);

    const me = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(me.status).toBe(401);
  });
});

describe("POST /api/auth/password-reset", () => {
  it("solicitud devuelve mensaje genérico y no filtra token", async () => {
    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: ADMIN_EMAIL });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("token");
  });

  it("solicitud para email inexistente usa la misma respuesta (mitigación enumeración)", async () => {
    const res = await request(app)
      .post("/api/auth/password-reset/request")
      .send({ email: "no-existe@corptlux.com" });
    expect(res.status).toBe(200);
  });

  it("restablece contraseña con token válido y permite login nuevo", async () => {
    const tokenValue = "reset-token-de-prueba";
    await pool.query(
      "INSERT INTO password_reset_tokens (admin_user_id, token_hash, expires_at) VALUES (1, ?, NOW() + INTERVAL 1 HOUR)",
      [sha256(tokenValue)]
    );
    const res = await request(app)
      .post("/api/auth/password-reset")
      .send({ token: tokenValue, password: "nueva-clave-123" });
    expect(res.status).toBe(200);

    const old = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(old.status).toBe(401);

    const fresh = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: "nueva-clave-123" });
    expect(fresh.status).toBe(200);
  });

  it("rechaza token inválido (400)", async () => {
    const res = await request(app)
      .post("/api/auth/password-reset")
      .send({ token: "token-que-no-existe", password: "nueva-clave-123" });
    expect(res.status).toBe(400);
  });
});