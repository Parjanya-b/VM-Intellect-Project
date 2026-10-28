import { createHash, randomBytes } from "node:crypto";
import type { RequestHandler } from "express";
import type { PublicUser, Role } from "@vmi/contracts";
import { db } from "../db";
import { config } from "../config";
import { AppError } from "../errors";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export interface UserRow {
  id: string;
  username: string;
  full_name: string;
  role: Role;
}

export function toPublicUser(row: UserRow): PublicUser {
  return { id: row.id, username: row.username, fullName: row.full_name, role: row.role };
}

export function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionHours * 3_600_000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(
    sha256(token),
    userId,
    expiresAt,
  );
  return { token, expiresAt };
}

export function purgeExpiredSessions() {
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(new Date().toISOString());
}

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Please sign in.");

  const sessionId = sha256(token);
  const row = db
    .prepare(
      `SELECT u.id, u.username, u.full_name, u.role, s.expires_at
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.id = ?`,
    )
    .get(sessionId) as (UserRow & { expires_at: string }) | undefined;

  if (!row || row.expires_at <= new Date().toISOString()) {
    throw new AppError(401, "SESSION_EXPIRED", "Your session has expired. Please sign in again.");
  }

  res.locals.user = toPublicUser(row);
  res.locals.sessionId = sessionId;
  next();
};

// Used later for admin-only and reviewer-only routes
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (_req, res, next) => {
    if (!roles.includes((res.locals.user as PublicUser).role)) {
      throw new AppError(403, "FORBIDDEN", "You do not have permission to do this.");
    }
    next();
  };
