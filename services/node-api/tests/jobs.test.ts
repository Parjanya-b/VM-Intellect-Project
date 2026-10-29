import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: Express;
let adminTok = "";
let aliceTok = "";
let bobTok = "";

const api = (method: "get" | "post" | "patch" | "delete", url: string, token?: string) => {
  const r = request(app)[method](`/api/v1${url}`);
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};

async function signup(username: string): Promise<string> {
  const res = await api("post", "/auth/signup").send({
    fullName: "Test User",
    username,
    password: "correct-horse-1",
  });
  return res.body.token as string;
}

beforeAll(async () => {
  process.env.VMI_DATA_DIR = mkdtempSync(path.join(os.tmpdir(), "vmi-test-"));
  process.env.LOG_LEVEL = "silent";
  const { createApp } = await import("../src/app");
  app = createApp();
  adminTok = await signup("admin1"); // first account = admin
  aliceTok = await signup("alice");
  bobTok = await signup("bob");
});

const jobBody = {
  title: "Bracket batch",
  goal: "Machine 200 aluminium brackets",
  constraints: { material: "Al 6061", quantity: 200 },
};
let jobId = "";

// Tests run in order and share state.
describe("jobs API", () => {
  it("requires sign-in", async () => {
    expect((await api("get", "/jobs")).status).toBe(401);
    expect((await api("post", "/jobs").send(jobBody)).status).toBe(401);
  });

  it("rejects invalid jobs with field errors", async () => {
    const res = await api("post", "/jobs", aliceTok).send({ title: "x", goal: "" });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty("title");
    expect(res.body.error.details).toHaveProperty("goal");
  });

  it("creates a draft job owned by the caller", async () => {
    const res = await api("post", "/jobs", aliceTok).send(jobBody);
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("draft");
    expect(res.body.revision).toBe(1);
    expect(res.body.constraints.quantity).toBe(200);
    jobId = res.body.id;
  });

  it("users see only their own jobs; admin sees all", async () => {
    expect((await api("get", "/jobs", aliceTok)).body.total).toBe(1);
    expect((await api("get", "/jobs", bobTok)).body.total).toBe(0);
    expect((await api("get", "/jobs", adminTok)).body.total).toBe(1);
  });

  it("hides other users' jobs with a 404 but lets admin read them", async () => {
    const bob = await api("get", `/jobs/${jobId}`, bobTok);
    expect(bob.status).toBe(404);
    expect(bob.body.error.code).toBe("JOB_NOT_FOUND");
    expect((await api("get", `/jobs/${jobId}`, adminTok)).status).toBe(200);
  });

  it("updates a job and bumps the revision; rejects empty and foreign updates", async () => {
    const res = await api("patch", `/jobs/${jobId}`, aliceTok).send({ title: "Bracket batch v2" });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe("Bracket batch v2");
    expect(res.body.revision).toBe(2);

    expect((await api("patch", `/jobs/${jobId}`, aliceTok).send({})).status).toBe(400);
    expect((await api("patch", `/jobs/${jobId}`, bobTok).send({ title: "Hacked" })).status).toBe(
      404,
    );

    const byAdmin = await api("patch", `/jobs/${jobId}`, adminTok).send({
      goal: "Updated by admin",
    });
    expect(byAdmin.status).toBe(200);
    expect(byAdmin.body.revision).toBe(3);
  });

  it("filters by search text, status and paginates", async () => {
    await api("post", "/jobs", aliceTok).send({
      title: "Gear housing",
      goal: "Finish machining of housing",
    });

    expect((await api("get", "/jobs?q=bracket", aliceTok)).body.total).toBe(1);
    expect((await api("get", "/jobs?status=draft", aliceTok)).body.total).toBe(2);
    expect((await api("get", "/jobs?status=completed", aliceTok)).body.total).toBe(0);
    expect((await api("get", "/jobs?status=bogus", aliceTok)).status).toBe(400);

    const page = await api("get", "/jobs?limit=1", aliceTok);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.total).toBe(2);
  });

  it("treats % and _ typed by the user literally", async () => {
    expect((await api("get", "/jobs?q=%25", aliceTok)).body.total).toBe(0);
  });

  it("archives a job: owner only, then it disappears", async () => {
    expect((await api("delete", `/jobs/${jobId}`, bobTok)).status).toBe(404);
    expect((await api("delete", `/jobs/${jobId}`, aliceTok)).status).toBe(204);
    expect((await api("get", `/jobs/${jobId}`, aliceTok)).status).toBe(404);
    expect((await api("get", "/jobs", aliceTok)).body.total).toBe(1);
  });
});
