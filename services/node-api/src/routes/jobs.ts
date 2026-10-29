import { Router } from "express";
import { randomUUID } from "node:crypto";
import {
  CreateJobRequestSchema,
  ListJobsQuerySchema,
  type Job,
  type JobConstraints,
  type JobListResponse,
  type JobStatus,
  type PublicUser,
} from "@vmi/contracts";
import { db } from "../db";
import { AppError } from "../errors";
import { parseBody } from "../validate";
import { audit } from "../audit";
import { requireAuth } from "../auth/session";

export const jobsRouter = Router();
jobsRouter.use(requireAuth);

export interface JobRow {
  id: string;
  owner_id: string;
  owner_name: string;
  title: string;
  goal: string;
  constraints_json: string;
  status: JobStatus;
  revision: number;
  created_at: string;
  updated_at: string;
}

export const JOB_SELECT = `SELECT j.id, j.owner_id, u.full_name AS owner_name, j.title, j.goal,
  j.constraints_json, j.status, j.revision, j.created_at, j.updated_at
  FROM jobs j JOIN users u ON u.id = j.owner_id`;

export function toJob(r: JobRow): Job {
  return {
    id: r.id,
    ownerId: r.owner_id,
    ownerName: r.owner_name,
    title: r.title,
    goal: r.goal,
    constraints: JSON.parse(r.constraints_json) as JobConstraints,
    status: r.status,
    revision: r.revision,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const seesAll = (u: PublicUser) => u.role === "admin" || u.role === "reviewer";

/** Load a job the user is allowed to see. Anything else is a plain 404. */
export function loadJob(id: string, user: PublicUser): JobRow {
  const row = db.prepare(`${JOB_SELECT} WHERE j.id = ? AND j.archived_at IS NULL`).get(id) as
    JobRow | undefined;
  if (!row || (!seesAll(user) && row.owner_id !== user.id)) {
    throw new AppError(404, "JOB_NOT_FOUND", "Job not found.");
  }
  return row;
}

export function assertCanEdit(row: JobRow, user: PublicUser) {
  if (row.owner_id !== user.id && user.role !== "admin") {
    throw new AppError(403, "FORBIDDEN", "Only the job owner or an admin can change this job.");
  }
}

jobsRouter.post("/", (req, res) => {
  const user = res.locals.user as PublicUser;
  const body = parseBody(CreateJobRequestSchema, req.body);
  const id = randomUUID();
  db.prepare(
    "INSERT INTO jobs (id, owner_id, title, goal, constraints_json) VALUES (?, ?, ?, ?, ?)",
  ).run(id, user.id, body.title, body.goal, JSON.stringify(body.constraints ?? {}));
  audit(user.id, "job.create", res.locals.traceId, id);
  res.status(201).json(toJob(loadJob(id, user)));
});

jobsRouter.get("/", (req, res) => {
  const user = res.locals.user as PublicUser;
  const { q, status, limit, offset } = parseBody(ListJobsQuerySchema, req.query);

  // The WHERE text is built only from fixed fragments; every value goes through ? parameters.
  const where = ["j.archived_at IS NULL"];
  const params: (string | number)[] = [];
  if (!seesAll(user)) {
    where.push("j.owner_id = ?");
    params.push(user.id);
  }
  if (status) {
    where.push("j.status = ?");
    params.push(status);
  }
  if (q) {
    const like = `%${q.replace(/[\\%_]/g, "\\$&")}%`; // escape LIKE wildcards typed by the user
    where.push("(j.title LIKE ? ESCAPE '\\' OR j.goal LIKE ? ESCAPE '\\')");
    params.push(like, like);
  }
  const clause = where.join(" AND ");

  const { n } = db.prepare(`SELECT COUNT(*) AS n FROM jobs j WHERE ${clause}`).get(...params) as {
    n: number;
  };
  const rows = db
    .prepare(`${JOB_SELECT} WHERE ${clause} ORDER BY j.updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as JobRow[];

  const body: JobListResponse = { items: rows.map(toJob), total: n };
  res.json(body);
});

jobsRouter.get("/:id", (req, res) => {
  res.json(toJob(loadJob(req.params.id, res.locals.user as PublicUser)));
});
