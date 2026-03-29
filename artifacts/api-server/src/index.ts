import 'dotenv/config';   // ✅ MUST be first line

import app from "./app";
import { logger } from "./lib/logger";

console.log("ENV CHECK:", {
  DATABASE_URL: process.env.DATABASE_URL,
  PORT: process.env.PORT
});


const rawPort = process.env["PORT"];
console.log("raw " , rawPort)

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
