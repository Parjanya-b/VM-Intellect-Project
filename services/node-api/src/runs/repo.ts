import type { AgentKey, AgentRun, RunStatus } from "@vmi/contracts";
import { db } from "../db";

export interface RunRow {
  id: string;
  job_id: string;
  agent: AgentKey;
  status: RunStatus;
  requested_by: string;
  input_json: string;
  output_json: string | null;
  warnings_json: string;
  error_message: string | null;
  model_version: string | null;
  duration_ms: number | null;
  trace_id: string;
  created_at: string;
  finished_at: string | null;
}

export const RUN_COLUMNS = `id, job_id, agent, status, requested_by, input_json, output_json, warnings_json,
  error_message, model_version, duration_ms, trace_id, created_at, finished_at`;

export function toAgentRun(r: RunRow): AgentRun {
  return {
    id: r.id,
    jobId: r.job_id,
    agent: r.agent,
    status: r.status,
    output: r.output_json ? (JSON.parse(r.output_json) as Record<string, unknown>) : null,
    warnings: JSON.parse(r.warnings_json) as string[],
    errorMessage: r.error_message,
    modelVersion: r.model_version,
    durationMs: r.duration_ms,
    traceId: r.trace_id,
    createdAt: r.created_at,
    finishedAt: r.finished_at,
  };
}

export function loadRunRow(id: string): RunRow {
  return db.prepare(`SELECT ${RUN_COLUMNS} FROM agent_runs WHERE id = ?`).get(id) as RunRow;
}

/** At startup, anything still "running" belongs to a process that no longer exists. */
export function markInterruptedRuns(): number {
  const res = db
    .prepare(
      `UPDATE agent_runs SET status = 'interrupted',
         error_message = 'The app stopped while this run was in progress.',
         finished_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE status = 'running'`,
    )
    .run();
  return res.changes;
}
