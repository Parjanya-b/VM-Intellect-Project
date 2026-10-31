import { z } from "zod";
import { config } from "../config";
import { AppError } from "../errors";

// Never trust the other service blindly: validate its answer.
const ResultSchema = z.object({
  runId: z.string(),
  agent: z.string(),
  status: z.enum(["completed", "needs_review", "failed"]),
  output: z.record(z.string(), z.unknown()),
  warnings: z.array(z.string()),
  modelVersion: z.string(),
  durationMs: z.number().int().nonnegative(),
});
export type PythonRunResult = z.infer<typeof ResultSchema>;

export interface PythonRunPayload {
  runId: string;
  jobId: string;
  traceId: string;
  input: Record<string, unknown>;
  files: { id: string; format: string; kind: string; originalName: string }[];
}

export class RunCancelledError extends Error {}

export async function runAgentOnPython(
  agent: string,
  payload: PythonRunPayload,
  cancel: AbortSignal,
): Promise<PythonRunResult> {
  if (!config.serviceToken) {
    throw new AppError(
      503,
      "AI_SERVICE_NOT_CONFIGURED",
      "The AI service token is not set. See .env.example.",
    );
  }
  const signal = AbortSignal.any([cancel, AbortSignal.timeout(config.pythonTimeoutMs)]);

  let res: Response;
  try {
    res = await fetch(`${config.pythonUrl}/v1/agents/${encodeURIComponent(agent)}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Service-Token": config.serviceToken },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (e) {
    if (cancel.aborted) throw new RunCancelledError("cancelled");
    if ((e as { name?: string }).name === "TimeoutError") {
      throw new AppError(504, "AI_SERVICE_TIMEOUT", "The AI service took too long to answer.");
    }
    throw new AppError(
      503,
      "AI_SERVICE_UNAVAILABLE",
      "The local AI service is not running. Start it with pnpm dev.",
    );
  }

  if (res.status === 401 || res.status === 503) {
    throw new AppError(
      502,
      "AI_SERVICE_AUTH_FAILED",
      "The AI service rejected the service token. Check VMI_SERVICE_TOKEN in .env.",
    );
  }
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new AppError(502, "AI_SERVICE_ERROR", message ?? "The AI service reported an error.");
  }
  const parsed = ResultSchema.safeParse(data);
  if (!parsed.success) {
    throw new AppError(
      502,
      "AI_SERVICE_BAD_RESPONSE",
      "The AI service returned an unexpected response.",
    );
  }
  return parsed.data;
}

export async function pingPython(): Promise<"ok" | "down" | "not_configured"> {
  if (!config.serviceToken) return "not_configured";
  try {
    const res = await fetch(`${config.pythonUrl}/health`, { signal: AbortSignal.timeout(1000) });
    if (!res.ok) return "down";
    const data = (await res.json()) as { tokenConfigured?: boolean };
    return data.tokenConfigured ? "ok" : "not_configured";
  } catch {
    return "down";
  }
}
