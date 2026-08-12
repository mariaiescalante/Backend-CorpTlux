import request from "supertest";
import { app } from "../src/app";
import { resetDb, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers/db";
import { pool } from "../src/config/db";
import { hashPassword } from "../src/utils/password";

let token = "";

beforeEach(async () => {
  await resetDb();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = login.body.token;
}, 15000);

describe("Validación de entrada", () => {
  it("rechaza id no numérico (400)", async () => {
    const res = await request(app).get("/api/articles/abc");
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  it("rechaza login con email inválido (400)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "no-es-un-email", password: ADMIN_PASSWORD });
    expect(res.status).toBe(400);
  });

  it("rechaza JSON malformado (400)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{email: admin@corptlux.com}");
    expect(res.status).toBe(400);
  });

  it("rechaza body con campos extra por strict (400)", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, extra: "nope" });
    expect(res.status).toBe(400);
  });
});

describe("Autenticación y permisos", () => {
  it("401 sin token en ruta protegida", async () => {
    const res = await request(app).get("/api/admin-users");
    expect(res.status).toBe(401);
  });

  it("401 con token inválido", async () => {
    const res = await request(app)
      .get("/api/admin-users")
      .set("Authorization", "Bearer token-invalido");
    expect(res.status).toBe(401);
  });

  it("403 para usuario sin el permiso requerido", async () => {
    const [roleResult] = await pool.query("INSERT INTO roles (name) VALUES ('solo-vista')");
    const roleId = (roleResult as { insertId: number }).insertId;
    await pool.query("INSERT INTO admin_users (role_id, name, email, password_hash, status) VALUES (?, 'Vista', 'viewer@corptlux.com', ?, 'active')", [
      roleId,
      await hashPassword(ADMIN_PASSWORD),
    ]);
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "viewer@corptlux.com", password: ADMIN_PASSWORD });
    expect(login.status).toBe(200);

    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ name: { es: "X", en: "Y" }, slug: { es: "x", en: "y" } });
    expect(res.status).toBe(403);
  });
});

describe("Rutas y CORS", () => {
  it("404 en ruta inexistente", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
  });

  it("403 con origen CORS no permitido", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://evil.com");
    expect(res.status).toBe(403);
  });

  it("200 en /api/health con origen permitido", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("Origin", "http://localhost:3000");
    expect(res.status).toBe(200);
  });
});