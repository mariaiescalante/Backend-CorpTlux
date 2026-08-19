import { pool } from "../config/db";

async function seedCategory() {
  console.log("[SEED] Insertando categoría predeterminada id:1...");
  try {
    await pool.query(
      `INSERT INTO categories (id, name, slug) 
       VALUES (1, '{"es": "Tecnología"}', '{"es": "tecnologia"}') 
       ON DUPLICATE KEY UPDATE id=1`
    );
    console.log("[SEED] ✅ Categoría predeterminada (id: 1) creada exitosamente");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] ❌ Error al insertar categoría:", err);
    process.exit(1);
  }
}

seedCategory();
