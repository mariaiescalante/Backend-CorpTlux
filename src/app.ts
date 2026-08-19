import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimit";
import { swaggerSpec } from "./docs/swagger";

export const app = express();

// Configuración de Helmet para desarrollo y producción permitiendo peticiones entre puertos
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  })
);

// Middleware CORS permisivo para desarrollo local (permite http://localhost:3000, 3001, 3002, 127.0.0.1)
app.use(
  cors({
    origin: true, // Permite cualquier origen de desarrollo local
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.use(globalRateLimiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api", routes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);
