-- Tabla de Leads / Mensajes recibidos
CREATE TABLE IF NOT EXISTS leads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  number VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subtitle TEXT NOT NULL,
  status ENUM('NUEVO', 'ATENDIDO', 'ARCHIVADO') DEFAULT 'NUEVO',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Configuración de Secciones de la Landing Page
CREATE TABLE IF NOT EXISTS landing_settings (
  section_key VARCHAR(100) PRIMARY KEY,
  content_json JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
