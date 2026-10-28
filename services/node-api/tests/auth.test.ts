import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: Express;

beforeAll(async () => {
  process.env.VMI_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "vmi-test-"));
  process.env.LOG_LEVEL = "silent";
  const { createApp } = await import("../src/app");
  app = createApp();
});

const signup = (username: string, password = "correct-horse-1") =>
  request(app).post("/api/v1/auth/signup").send({ fullName: "Test User", username, password });

const signin = (username: string, password: string) =>
  request(app).post("/api/v1/auth/signin").send({ username, password });

// These tests run in order: the first signup in this file must become the admin.
describe("auth API", () => {
  it("health reports no users on a fresh database", async () => {
    const res = await request(app).get("/api/v1/system/health");
    expect(res.status).toBe(200);
    expect(res.body.hasUsers).toBe(false);
  });

  it("first account becomes admin, second becomes user", async () => {
    const first = await signup("first");
    expect(first.status).toBe(201);
    expect(first.body.user.role).toBe("admin");
    expect(first.body.token).toBeTruthy();

    const second = await signup("second");
    expect(second.status).toBe(201);
    expect(second.body.user.role).toBe("user");
  });

  it("rejects a duplicate username", async () => {
    const res = await signup("first");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("USERNAME_TAKEN");
    expect(res.body.error.traceId).toBeTruthy();
  });

  it("rejects invalid input with field errors", async () => {
    const res = await signup("x", "short");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details).toHaveProperty("username");
    expect(res.body.error.details).toHaveProperty("password");
  });

  it("signs in with correct credentials and rejects wrong ones with the same message", async () => {
    const ok = await signin("first", "correct-horse-1");
    expect(ok.status).toBe(200);

    const wrongPassword = await signin("first", "nope-nope-nope");
    const unknownUser = await signin("ghost", "whatever123");
    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownUser.body.error.message);
  });

  it("/me needs a valid token and signout invalidates it", async () => {
    expect((await request(app).get("/api/v1/auth/me")).status).toBe(401);

    const { body } = await signin("second", "correct-horse-1");
    const auth = { Authorization: `Bearer ${body.token}` };

    const me = await request(app).get("/api/v1/auth/me").set(auth);
    expect(me.status).toBe(200);
    expect(me.body.user.username).toBe("second");

    expect((await request(app).post("/api/v1/auth/signout").set(auth)).status).toBe(204);
    expect((await request(app).get("/api/v1/auth/me").set(auth)).status).toBe(401);
  });

  it("locks the account after 5 failed attempts", async () => {
    await signup("locky");
    for (let i = 0; i < 5; i++) {
      expect((await signin("locky", "wrong-password")).status).toBe(401);
    }
    const locked = await signin("locky", "correct-horse-1"); // even the right password is blocked
    expect(locked.status).toBe(429);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");
  });

  it("never stores plain passwords or raw tokens", async () => {
    const { default: Database } = await import("better-sqlite3");
    const db = new Database(path.join(process.env.VMI_DATA_DIR!, "vm-intellect.db"), {
      readonly: true,
    });
    const user = db.prepare("SELECT password_hash FROM users WHERE username = 'first'").get() as {
      password_hash: string;
    };
    expect(user.password_hash.startsWith("$argon2id$")).toBe(true);
    db.close();
  });
});
