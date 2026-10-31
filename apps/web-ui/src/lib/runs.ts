import type { AgentKey, AgentRun, RunListResponse } from "@vmi/contracts";
import { api } from "./api";

export const listRuns = (jobId: string) => api<RunListResponse>(`/jobs/${jobId}/runs`);
export const runAgent = (jobId: string, agent: AgentKey) =>
  api<AgentRun>(`/jobs/${jobId}/agents/${agent}/run`, { method: "POST", body: { input: {} } });
export const cancelRun = (runId: string) =>
  api<AgentRun>(`/runs/${runId}/cancel`, { method: "POST" });
