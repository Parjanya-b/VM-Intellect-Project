import { Router } from "express";
import { randomUUID } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { SigninRequestSchema, SignupRequestSchema, type AuthResponse, type Role } from "@vmi/contracts";
import { db } from "../db";
import { config } from "../config";
import { AppError } from "../errors";
import { parseBody } from "../validate";
import { audit } from "../audit";
import { createSession, requireAuth, sha256, toPublicUser, type UserRow } from "../auth/session";

export const authRouter = Router();

// Argon2id (the library default algorithm) with OWASP-minimum cost settings
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

authRouter.post("/signup", async (req, res) => {
  const body = parseBody(SignupRequestSchema, req.body);

  if (db.prepare("SELECT 1 FROM users WHERE username = ?").get(body.username)) {
    throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
  }

  const passwordHash = await hash(body.password, ARGON);
  const id = randomUUID();
  let role: Role = "user";

  try {
    db.transaction(() => {
      const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
      role = n === 0 ? "admin" : "user"; // the first account becomes Admin
      db.prepare(
        "INSERT INTO users (id, username, full_name, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      ).run(id, body.username, body.fullName, passwordHash, role);
    })();
  } catch (e) {
    if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new AppError(409, "USERNAME_TAKEN", "That username is already in use.");
    }
    throw e;
  }

  audit(id, "auth.signup", res.locals.traceId, `role=${role}`);
  const session = createSession(id);
  const response: AuthResponse = {
    ...session,
    user: toPublicUser({ id, username: body.username, full_name: body.fullName, role }),
  };
  res.status(201).json(response);
});

authRouter.post("/signin", async (req, res) => {
  const { username, password } = parseBody(SigninRequestSchema, req.body);
  const invalid = () => new AppError(401, "INVALID_CREDENTIALS", "Incorrect username or password.");

  const row = db
    .prepare(
      "SELECT id, username, full_name, role, password_hash, failed_attempts, locked_until FROM users WHERE username = ?",
    )
    .get(username) as
    (UserRow & { password_hash: string; failed_attempts: number; locked_until: string | null }) | undefined;

  if (!row) throw invalid(); // same message as a wrong password: don't reveal which usernames exist

  if (row.locked_until && row.locked_until > new Date().toISOString()) {
    throw new AppError(429, "ACCOUNT_LOCKED", "Too many failed attempts. Please try again in a few minutes.");
  }

  const ok = await verify(row.password_hash, password);
  if (!ok) {
    const attempts = row.failed_attempts + 1;
    const lockedUntil =
      attempts >= config.maxFailedAttempts
        ? new Date(Date.now() + config.lockMinutes * 60_000).toISOString()
        : null;
    db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").run(
      lockedUntil ? 0 : attempts,
      lockedUntil,
      row.id,
    );
    audit(row.id, lockedUntil ? "auth.locked" : "auth.signin_failed", res.locals.traceId);
    throw invalid();
  }

  db.prepare("UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?").run(row.id);
  audit(row.id, "auth.signin", res.locals.traceId);
  const response: AuthResponse = { ...createSession(row.id), user: toPublicUser(row) };
  res.json(response);
});

authRouter.post("/signout", requireAuth, (_req, res) => {
  db.prepare("DELETE FROM sessions WHERE id = ?").run(res.locals.sessionId);
  audit(res.locals.user.id, "auth.signout", res.locals.traceId);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ user: res.locals.user });
});
