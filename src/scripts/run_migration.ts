import { pool } from "../config/db";

async function runMigration() {
  console.log("[MIGRATION] Iniciando creación de tablas en MySQL...");

  const queries = [
    // 1. Tabla de Leads
    `CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      number VARCHAR(20) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subtitle TEXT NOT NULL,
      status ENUM('NUEVO', 'ATENDIDO', 'ARCHIVADO') DEFAULT 'NUEVO',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // 2. Tabla de Configuración de la Landing (JSON Nativo)
    `CREATE TABLE IF NOT EXISTS landing_settings (
      section_key VARCHAR(100) PRIMARY KEY,
      content_json JSON NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,

    // 3. Tabla de FAQ Categories
    `CREATE TABLE IF NOT EXISTS faq_categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`,

    // 4. Tabla de FAQs
    `CREATE TABLE IF NOT EXISTS faqs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      faq_category_id INT,
      question JSON NOT NULL,
      answer JSON NOT NULL,
      position INT DEFAULT 0,
      status ENUM('active', 'inactive') DEFAULT 'active',
      created_by INT NULL,
      updated_by INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`,

    // 5. Tabla de Artículos de Blog
    `CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      excerpt TEXT,
      content LONGTEXT,
      cover_image VARCHAR(500),
      status ENUM('PUBLICADO', 'BORRADOR') DEFAULT 'PUBLICADO',
      author VARCHAR(100) DEFAULT 'Equipo TLUX',
      views INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );`
  ];

  try {
    for (const query of queries) {
      await pool.query(query);
    }
    console.log("[MIGRATION] ✅ ¡Todas las tablas han sido creadas exitosamente en MySQL!");
    process.exit(0);
  } catch (error) {
    console.error("[MIGRATION] ❌ Error al crear las tablas en MySQL:", error);
    process.exit(1);
  }
}

runMigration();
