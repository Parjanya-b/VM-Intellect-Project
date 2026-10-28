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
