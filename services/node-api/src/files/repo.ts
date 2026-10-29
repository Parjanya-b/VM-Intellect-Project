import type { FileKind, JobFile } from "@vmi/contracts";
import { db } from "../db";

export interface FileRow {
  id: string;
  job_id: string;
  uploaded_by: string;
  original_name: string;
  format: string;
  kind: FileKind;
  size_bytes: number;
  sha256: string;
  status: JobFile["status"];
  created_at: string;
}

export const FILE_COLUMNS =
  "id, job_id, uploaded_by, original_name, format, kind, size_bytes, sha256, status, created_at";

export function toJobFile(r: FileRow): JobFile {
  return {
    id: r.id,
    jobId: r.job_id,
    originalName: r.original_name,
    format: r.format,
    kind: r.kind,
    sizeBytes: r.size_bytes,
    sha256: r.sha256,
    status: r.status,
    createdAt: r.created_at,
  };
}

export function listJobFiles(jobId: string): JobFile[] {
  const rows = db
    .prepare(
      `SELECT ${FILE_COLUMNS} FROM files WHERE job_id = ? AND deleted_at IS NULL ORDER BY created_at, id`,
    )
    .all(jobId) as FileRow[];
  return rows.map(toJobFile);
}
