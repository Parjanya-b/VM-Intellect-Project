import type { CreateJobRequest, Job, JobListResponse, JobStatus } from "@vmi/contracts";
import { api } from "./api";

export const STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Draft",
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  needs_review: "Needs review",
  completed: "Completed",
  failed: "Failed",
  interrupted: "Interrupted",
};

export interface ListParams {
  q?: string;
  status?: JobStatus | "";
  limit?: number;
  offset?: number;
}

export function listJobs(p: ListParams = {}) {
  const qs = new URLSearchParams();
  if (p.q) qs.set("q", p.q);
  if (p.status) qs.set("status", p.status);
  qs.set("limit", String(p.limit ?? 20));
  qs.set("offset", String(p.offset ?? 0));
  return api<JobListResponse>(`/jobs?${qs.toString()}`);
}

export const getJob = (id: string) => api<Job>(`/jobs/${id}`);
export const createJob = (body: CreateJobRequest) => api<Job>("/jobs", { method: "POST", body });
export const archiveJob = (id: string) => api<void>(`/jobs/${id}`, { method: "DELETE" });

export const formatDate = (iso: string) => new Date(iso).toLocaleString();
