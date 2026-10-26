import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./logger";
import { purgeExpiredSessions } from "./auth/session";

purgeExpiredSessions();

const server = createApp().listen(config.port, config.host, () => {
  logger.info(`VM Intellect API listening on http://${config.host}:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
