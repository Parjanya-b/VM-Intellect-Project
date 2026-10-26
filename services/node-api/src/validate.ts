import { z, type ZodType } from "zod";
import { AppError } from "./errors";

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = z.flattenError(result.error).fieldErrors as Record<string, string[]>;
    throw new AppError(400, "VALIDATION_ERROR", "Please check the highlighted fields.", details);
  }
  return result.data;
}
