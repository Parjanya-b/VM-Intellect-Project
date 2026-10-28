import type { ErrorRequestHandler } from "express";
import { logger } from "./logger";

export class AppError extends Error {
  status: number;
  code: string;
  details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const traceId = res.locals.traceId as string;

  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details, traceId },
    });
    return;
  }
  if ((err as { type?: string })?.type === "entity.parse.failed") {
    res
      .status(400)
      .json({ error: { code: "BAD_JSON", message: "Request body is not valid JSON.", traceId } });
    return;
  }

  logger.error({ err, traceId }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: "Something went wrong. Please quote the trace ID when reporting this.",
      traceId,
    },
  });
};
