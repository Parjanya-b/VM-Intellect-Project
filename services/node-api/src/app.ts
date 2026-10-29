import express from "express";
import { randomUUID } from "node:crypto";
import { logger } from "./logger";
import { AppError, errorHandler } from "./errors";
import { systemRouter } from "./routes/system";
import { authRouter } from "./routes/auth";
import { jobsRouter } from "./routes/jobs";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  // Trace ID on every request/response. NEVER log request bodies (they contain passwords).
  app.use((req, res, next) => {
    const traceId = randomUUID();
    res.locals.traceId = traceId;
    res.setHeader("X-Trace-Id", traceId);
    logger.info({ traceId, method: req.method, url: req.url }, "request");
    next();
  });

  app.use("/api/v1/system", systemRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/jobs", jobsRouter);

  app.use((_req, _res, next) => next(new AppError(404, "NOT_FOUND", "Route not found.")));
  app.use(errorHandler);
  return app;
}
