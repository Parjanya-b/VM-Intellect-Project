import { createApp } from "./app";
import { config } from "./config";
import { logger } from "./logger";
import { purgeExpiredSessions } from "./auth/session";
import { markInterruptedRuns } from "./runs/repo";

purgeExpiredSessions();
const interrupted = markInterruptedRuns();
if (interrupted > 0) logger.warn(`Marked ${interrupted} unfinished run(s) as interrupted`);

const server = createApp().listen(config.port, config.host, () => {
  logger.info(`VM Intellect API listening on http://${config.host}:${config.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
