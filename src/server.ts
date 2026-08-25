import { app } from "./app";
import { config } from "./config";
import { testConnection } from "./config/db";

async function bootstrap() {
  try {
    await testConnection();
    console.log(`✅ Conexión a MySQL establecida (${config.db.host}:${config.db.port}/${config.db.database})`);
  } catch (err) {
    console.error("❌ No se pudo conectar a la base de datos:");
    console.error(err);
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`API corriendo en http://localhost:${config.port}`);
  });
}

bootstrap();
                     