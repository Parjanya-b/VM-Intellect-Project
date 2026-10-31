import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  AgentKeySchema,
  RunAgentRequestSchema,
  type PublicUser,
  type RunListResponse,
} from "@vmi/contracts";
import { config } from "../config";
import { db } from "../db";
import { AppError } from "../errors";
import { parseBody } from "../validate";
import { audit } from "../audit";
import { requireAuth } from "../auth/session";
import { assertCanEdit, loadJob } from "./jobs";
import { listJobFiles } from "../files/repo";
import { RunCancelledError, runAgentOnPython } from "../python/client";
import { RUN_COLUMNS, loadRunRow, toAgentRun, type RunRow } from "../runs/repo";

export const runsRouter = Router();

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

// In-memory handles so a running request can be cancelled. Lost on restart (see markInterruptedRuns).
export const activeRuns = new Map<string, AbortController>();

/** Find a run the user may access. Errors are always a plain 404. */
export function loadRunWithAccess(id: string, user: PublicUser) {
  const row = db.prepare(`SELECT ${RUN_COLUMNS} FROM agent_runs WHERE id = ?`).get(id) as
    RunRow | undefined;
  if (!row) throw new AppError(404, "RUN_NOT_FOUND", "Run not found.");
  try {
    return { run: row, job: loadJob(row.job_id, user) };
  } catch {
    throw new AppError(404, "RUN_NOT_FOUND", "Run not found.");
  }
}

runsRouter.post("/jobs/:id/agents/:name/run", requireAuth, async (req, res) => {
  const user = res.locals.user as PublicUser;
  const job = loadJob(req.params.id as string, user);
  assertCanEdit(job, user);

  const agent = AgentKeySchema.safeParse(req.params.name);
  if (!agent.success) throw new AppError(404, "UNKNOWN_AGENT", "Unknown agent.");
  const body = parseBody(RunAgentRequestSchema, req.body ?? {});

  if (!config.serviceToken) {
    throw new AppError(
      503,
      "AI_SERVICE_NOT_CONFIGURED",
      "The AI service token is not set. See .env.example.",
    );
  }
  const busy = db
    .prepare("SELECT 1 FROM agent_runs WHERE job_id = ? AND agent = ? AND status = 'running'")
    .get(job.id, agent.data);
  if (busy)
    throw new AppError(409, "RUN_IN_PROGRESS", "This agent is already running for this job.");

  const files = listJobFiles(job.id);
  const runId = randomUUID();
  const traceId = res.locals.traceId as string;
  const input = body.input ?? {};

  // Record the run BEFORE calling Python, so a crash always leaves a trace.
  db.prepare(
    `INSERT INTO agent_runs (id, job_id, agent, status, requested_by, input_json, trace_id)
     VALUES (?, ?, ?, 'running', ?, ?, ?)`,
  ).run(
    runId,
    job.id,
    agent.data,
    user.id,
    JSON.stringify({ fileIds: files.map((f) => f.id), params: input }),
    traceId,
  );
  audit(user.id, "run.start", traceId, `${job.id}/${agent.data}/${runId}`);

  const controller = new AbortController();
  activeRuns.set(runId, controller);
  try {
    const result = await runAgentOnPython(
      agent.data,
      {
        runId,
        jobId: job.id,
        traceId,
        input,
        files: files.map((f) => ({
          id: f.id,
          format: f.format,
          kind: f.kind,
          originalName: f.originalName,
        })),
      },
      controller.signal,
    );
    // "AND status = 'running'" so a run that was cancelled meanwhile is never overwritten.
    db.prepare(
      `UPDATE agent_runs SET status = ?, output_json = ?, warnings_json = ?, model_version = ?,
         duration_ms = ?, finished_at = ${NOW} WHERE id = ? AND status = 'running'`,
    ).run(
      result.status,
      JSON.stringify(result.output),
      JSON.stringify(result.warnings),
      result.modelVersion,
      result.durationMs,
      runId,
    );
    res.status(201).json(toAgentRun(loadRunRow(runId)));
  } catch (e) {
    if (e instanceof RunCancelledError) {
      throw new AppError(409, "RUN_CANCELLED", "The run was cancelled.");
    }
    const message = e instanceof AppError ? e.message : "The run failed unexpectedly.";
    db.prepare(
      `UPDATE agent_runs SET status = 'failed', error_message = ?, finished_at = ${NOW}
       WHERE id = ? AND status = 'running'`,
    ).run(message, runId);
    throw e;
  } finally {
    activeRuns.delete(runId);
  }
});

runsRouter.get("/runs/:id", requireAuth, (req, res) => {
  const { run } = loadRunWithAccess(req.params.id as string, res.locals.user as PublicUser);
  res.json(toAgentRun(run));
});

runsRouter.get("/jobs/:id/runs", requireAuth, (req, res) => {
  const job = loadJob(req.params.id as string, res.locals.user as PublicUser);
  const rows = db
    .prepare(
      `SELECT ${RUN_COLUMNS} FROM agent_runs WHERE job_id = ? ORDER BY created_at DESC, id LIMIT 50`,
    )
    .all(job.id) as RunRow[];
  const body: RunListResponse = { items: rows.map(toAgentRun) };
  res.json(body);
});

runsRouter.post("/runs/:id/cancel", requireAuth, (req, res) => {
  const user = res.locals.user as PublicUser;
  const { run, job } = loadRunWithAccess(req.params.id as string, user);
  assertCanEdit(job, user);
  if (run.status !== "running") {
    throw new AppError(409, "RUN_NOT_RUNNING", "Only a running run can be cancelled.");
  }
  // Mark first, then abort: the waiting request then sees a run that is already cancelled.
  db.prepare(
    `UPDATE agent_runs SET status = 'cancelled', finished_at = ${NOW} WHERE id = ? AND status = 'running'`,
  ).run(run.id);
  activeRuns.get(run.id)?.abort();
  audit(user.id, "run.cancel", res.locals.traceId, run.id);
  res.json(toAgentRun(loadRunRow(run.id)));
});
