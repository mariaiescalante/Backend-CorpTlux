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

const validCategory = {
  name: { es: "Tecnología", en: "Technology" },
  slug: { es: "tecnologia", en: "technology" },
  description: { es: "Noticias de tecnología", en: "Tech news" },
  position: 0,
  status: "active",
};

describe("GET /api/categories", () => {
  it("lista públicas sin token (200)", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("total");
  });

  it("soporta paginación", async () => {
    for (let i = 1; i <= 3; i++) {
      await request(app)
        .post("/api/categories")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...validCategory, name: { es: `Cat ${i}`, en: `Cat ${i}` }, slug: { es: `cat-${i}`, en: `cat-${i}` } });
    }
    const res = await request(app).get("/api/categories?page=1&limit=2");
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
    expect(res.body.page).toBe(1);
  });
});

describe("POST /api/categories", () => {
  it("crea categoría con token (201)", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    expect(res.status).toBe(201);
    expect(res.body.id).toEqual(expect.any(Number));
  });

  it("rechaza sin token (401)", async () => {
    const res = await request(app).post("/api/categories").send(validCategory);
    expect(res.status).toBe(401);
  });

  it("registra la creación en activity_log", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    expect(res.status).toBe(201);
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS cnt FROM activity_log WHERE action = 'create' AND entity_type = 'category' AND entity_id = ?`,
      [res.body.id]
    );
    expect((rows as { cnt: number }[])[0].cnt).toBe(1);
  });

  it("rechaza slug duplicado (409)", async () => {
    await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    expect(res.status).toBe(409);
  });

  it("rechaza campos extra por strict (400)", async () => {
    const res = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validCategory, campo_inesperado: true });
    expect(res.status).toBe(400);
  });
});

describe("PUT/DELETE /api/categories/:id", () => {
  it("actualiza y luego obtiene el cambio (200)", async () => {
    const created = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    const res = await request(app)
      .put(`/api/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ position: 5, status: "inactive" });
    expect(res.status).toBe(200);

    const got = await request(app).get(`/api/categories/${created.body.id}`);
    expect(got.status).toBe(200);
    expect(got.body.item.position).toBe(5);
    expect(got.body.item.status).toBe("inactive");
  });

  it("elimina y luego 404 al consultarla", async () => {
    const created = await request(app)
      .post("/api/categories")
      .set("Authorization", `Bearer ${token}`)
      .send(validCategory);
    const del = await request(app)
      .delete(`/api/categories/${created.body.id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(200);

    const got = await request(app).get(`/api/categories/${created.body.id}`);
    expect(got.status).toBe(404);
  });

  it("404 si el recurso no existe", async () => {
    const res = await request(app).get("/api/categories/9999");
    expect(res.status).toBe(404);
  });
});