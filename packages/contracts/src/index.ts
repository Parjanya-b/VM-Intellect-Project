import { z } from "zod";

/* ---------- Personas (change the view, never permissions) ---------- */
export const PERSONAS = [
  "student",
  "technician",
  "engineer",
  "manufacturer",
  "researcher",
] as const;
export const PersonaSchema = z.enum(PERSONAS);
export type Persona = z.infer<typeof PersonaSchema>;

/* ---------- Permission roles ---------- */
export const ROLES = ["user", "reviewer", "admin"] as const;
export const RoleSchema = z.enum(ROLES);
export type Role = z.infer<typeof RoleSchema>;

/* ---------- Auth requests ---------- */
const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "At least 3 characters")
  .max(32, "At most 32 characters")
  .regex(/^[a-z0-9._-]+$/, "Use letters, numbers, dot, dash or underscore");

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(128, "At most 128 characters");

export const SignupRequestSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(80),
  username: usernameSchema,
  password: passwordSchema,
});
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const SigninRequestSchema = z.object({
  username: z.string().trim().toLowerCase().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password").max(128),
});
export type SigninRequest = z.infer<typeof SigninRequestSchema>;

/* ---------- Responses ---------- */
export interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  expiresAt: string; // ISO date
  user: PublicUser;
}

export interface HealthResponse {
  status: "ok";
  offlineReady: boolean;
  coreBundleVersion: string | null;
  lastBackupAt: string | null;
  schemaVersion: number;
  hasUsers: boolean;
}

/* ---------- Standard error format (with trace ID) ---------- */
export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    traceId: string;
    details?: Record<string, string[]>;
  };
}

/* ---------- Jobs ---------- */
export const JOB_STATUSES = [
  "draft",
  "uploaded",
  "queued",
  "processing",
  "needs_review",
  "completed",
  "failed",
  "interrupted",
] as const;
export const JobStatusSchema = z.enum(JOB_STATUSES);
export type JobStatus = z.infer<typeof JobStatusSchema>;

export const JobConstraintsSchema = z.object({
  material: z.string().trim().max(80).optional(),
  quantity: z.number().int().min(1).max(10_000_000).optional(),
  tolerance: z.string().trim().max(80).optional(),
});
export type JobConstraints = z.infer<typeof JobConstraintsSchema>;

export const CreateJobRequestSchema = z.object({
  title: z.string().trim().min(3, "At least 3 characters").max(120, "At most 120 characters"),
  goal: z.string().trim().min(5, "Describe the goal in a few words").max(2000),
  constraints: JobConstraintsSchema.optional(),
});
export type CreateJobRequest = z.infer<typeof CreateJobRequestSchema>;

export const UpdateJobRequestSchema = CreateJobRequestSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: "Nothing to update" },
);
export type UpdateJobRequest = z.infer<typeof UpdateJobRequestSchema>;

export const ListJobsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: JobStatusSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export interface Job {
  id: string;
  ownerId: string;
  ownerName: string;
  title: string;
  goal: string;
  constraints: JobConstraints;
  status: JobStatus;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

export interface JobListResponse {
  items: Job[];
  total: number;
}

/* The 8 agent steps shown on the job overview timeline */
export const AGENT_STEPS = [
  { key: "understanding", label: "Understanding", path: "understand" },
  { key: "drawing", label: "Drawing Analysis", path: "drawing" },
  { key: "selection", label: "Material and Machine", path: "selection" },
  { key: "planning", label: "Process Planning", path: "plan" },
  { key: "cam", label: "CAM Support", path: "cam" },
  { key: "simulation", label: "Simulation", path: "simulation" },
  { key: "optimization", label: "Optimization", path: "optimize" },
  { key: "reporting", label: "Reporting", path: "report" },
] as const;
