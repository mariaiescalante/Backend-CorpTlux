import request from "supertest";
import { app } from "../src/app";
import { resetDb, ADMIN_EMAIL, ADMIN_PASSWORD } from "./helpers/db";
import { pool } from "../src/config/db";

let token = "";

beforeEach(async () => {
  await resetDb();
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  token = login.body.token;
}, 15000);

describe("POST /api/admin-users", () => {
  it("crea usuario con password y hashea en servidor (201)", async () => {
    const res = await request(app)
      .post("/api/admin-users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role_id: 1,
        name: "Nuevo Admin",
        email: "nuevo@corptlux.com",
        password: "clave-secreta-123",
      });
    expect(res.status).toBe(201);

    const [rows] = await pool.query("SELECT password_hash FROM admin_users WHERE id = ?", [res.body.id]);
    const hash = (rows as { password_hash: string }[])[0].password_hash;
    expect(hash).not.toContain("clave-secreta-123");
  });

  it("rechaza enviar password_hash (400 por strict)", async () => {
    const res = await request(app)
      .post("/api/admin-users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role_id: 1,
        name: "Nuevo Admin",
        email: "nuevo2@corptlux.com",
        password_hash: "algo",
      });
    expect(res.status).toBe(400);
  });

  it("permite login con el password creado", async () => {
    await request(app)
      .post("/api/admin-users")
      .set("Authorization", `Bearer ${token}`)
      .send({
        role_id: 1,
        name: "Nuevo Admin",
        email: "nuevo3@corptlux.com",
        password: "clave-secreta-123",
      });
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: "nuevo3@corptlux.com", password: "clave-secreta-123" });
    expect(login.status).toBe(200);
  });
});

describe("DELETE /api/admin-users/:id", () => {
  it("404 al borrar un usuario inexistente", async () => {
    const res = await request(app)
      .delete("/api/admin-users/9999")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

describe("Formato de errores unificado", () => {
  it("errores de API usan { message }", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "nadie@corptlux.com", password: "incorrecta" });
    expect(res.status).toBe(401);
    expect(res.body.message).toBeDefined();
    expect(res.body.error).toBeUndefined();
  });

  it("validación devuelve { message, errors }", async () => {
    const res = await request(app).get("/api/articles/abc");
    expect(res.status).toBe(400);
    expect(res.body.message).toBeDefined();
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  it("404 usa { message }", async () => {
    const res = await request(app).get("/api/no-existe");
    expect(res.status).toBe(404);
    expect(res.body.message).toBeDefined();
  });
});
