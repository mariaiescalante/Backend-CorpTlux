import express from "express";
import cors from "cors";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";
import routes from "./routes";
import { notFound, errorHandler } from "./middleware/errorHandler";
import { globalRateLimiter } from "./middleware/rateLimit";
import { config } from "./config";
import { ApiError } from "./utils/ApiError";
import { swaggerSpec } from "./docs/swagger";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new ApiError(403, "Origen no permitido por CORS"));
    },
  })
);
app.use(globalRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", routes);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(notFound);
app.use(errorHandler);
