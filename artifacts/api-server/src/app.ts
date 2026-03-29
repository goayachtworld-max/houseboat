import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
// CORS_ORIGIN should be your cPanel frontend domain, e.g.:
//   CORS_ORIGIN=https://yourdomain.com
// Multiple origins can be comma-separated:
//   CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
// Leave unset (or set to "*") only for local development.
// ---------------------------------------------------------------------------
const rawCorsOrigin = process.env.CORS_ORIGIN;

let corsOrigin: cors.CorsOptions["origin"];

if (!rawCorsOrigin || rawCorsOrigin === "*") {
  // Dev fallback — allow everything (never use in production)
  logger.warn("CORS_ORIGIN is not set — allowing all origins. Set it in production!");
  corsOrigin = true;
} else {
  const allowed = rawCorsOrigin.split(",").map((o) => o.trim()).filter(Boolean);
  corsOrigin = (origin, callback) => {
    // Allow requests with no Origin header (e.g. server-to-server, curl)
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    logger.warn({ origin }, "CORS blocked request from disallowed origin");
    callback(new Error(`CORS: origin '${origin}' is not allowed`));
  };
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ credentials: true, origin: corsOrigin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);

export default app;
