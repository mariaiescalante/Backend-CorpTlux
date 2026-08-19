import { pool } from "../config/db";

async function seedFK() {
  console.log("[SEED] Verificando llaves foráneas...");
  try {
    await pool.query(
      `INSERT INTO categories (id, name, slug) VALUES (1, '{"es": "General"}', '{"es": "general"}') 
       ON DUPLICATE KEY UPDATE id=1`
    );
    await pool.query(
      `INSERT INTO admin_users (id, username, email, password_hash, status) VALUES (1, 'admin', 'admin@tlux.studio', 'hash', 'active') 
       ON DUPLICATE KEY UPDATE id=1`
    );
    console.log("[SEED] ✅ Llaves foráneas verificadas correctamente");
    process.exit(0);
  } catch (err) {
    console.error("[SEED] ❌ Error en llaves foráneas:", err);
    process.exit(1);
  }
}

seedFK();
