import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const TOKEN = "test-token";

interface FakeBody {
  runId: string;
  files: { id: string }[];
  input?: { simulate?: string; delayMs?: number; note?: string };
}
interface Received {
  token: string | undefined;
  agent: string;
  body: FakeBody;
}
interface RunItem {
  id: string;
  agent: string;
  status: string;
}

let app: Express;
let fake: http.Server;
let aliceTok = "";
let bobTok = "";
let jobId = "";
const received: Received[] = [];

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  // A fake AI service. input.simulate / input.delayMs let each test choose the behavior.
  fake = http.createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/health")
      return res.end(JSON.stringify({ status: "ok", tokenConfigured: true }));
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}") as FakeBody;
      const agent = decodeURIComponent((req.url ?? "").split("/")[3] ?? "");
      received.push({ token: req.headers["x-service-token"] as string | undefined, agent, body });
      const simulate = body.input?.simulate;
      const reply = () => {
        if (simulate === "auth") {
          res.statusCode = 401;
          return res.end(
            JSON.stringify({ error: { code: "INVALID_SERVICE_TOKEN", message: "no" } }),
          );
        }
        if (simulate === "garbage") return res.end(JSON.stringify({ hello: "world" }));
        res.end(
          JSON.stringify({
            runId: body.runId,
            agent,
            status: "completed",
            output: { stub: true, fileCount: body.files.length },
            warnings: ["Stub agent"],
            modelVersion: "fake-0",
            durationMs: 5,
          }),
        );
      };
      setTimeout(reply, Number(body.input?.delayMs ?? 0));
    });
  });
  await new Promise<void>((r) => fake.listen(0, "127.0.0.1", r));

  process.env.VMI_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "vmi-test-"));
  process.env.VMI_PYTHON_URL = `http://127.0.0.1:${(fake.address() as AddressInfo).port}`;
  process.env.VMI_SERVICE_TOKEN = TOKEN;
  process.env.VMI_PYTHON_TIMEOUT_MS = "1500";
  process.env.LOG_LEVEL = "silent";
  const { createApp } = await import("../src/app");
  app = createApp();

  await signup("admin1"); // first account = admin
  aliceTok = await signup("alice");
  bobTok = await signup("bob");
  jobId = (
    await api("post", "/jobs", aliceTok).send({ title: "Run test", goal: "Testing agent runs" })
  ).body.id;
});

afterAll(async () => {
  fake.closeAllConnections();
  await new Promise((r) => fake.close(r));
});

// Tests run in order and share state.
describe("agent runs API", () => {
  it("requires sign-in and a known agent", async () => {
    expect((await api("post", `/jobs/${jobId}/agents/drawing/run`)).status).toBe(401);
    const res = await api("post", `/jobs/${jobId}/agents/hacker/run`, aliceTok);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("UNKNOWN_AGENT");
  });

  it("runs an agent, sends the token and file ids, and records the run", async () => {
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
    const up = await api("post", `/jobs/${jobId}/files`, aliceTok).attach(
      "file",
      pdf,
      "drawing.pdf",
    );
    expect(up.status).toBe(201);

    const res = await api("post", `/jobs/${jobId}/agents/drawing/run`, aliceTok).send({
      input: { note: "hi" },
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("completed");
    expect(res.body.agent).toBe("drawing");
    expect(res.body.modelVersion).toBe("fake-0");
    expect(res.body.output.fileCount).toBe(1);

    const call = received[received.length - 1];
    expect(call.token).toBe(TOKEN);
    expect(call.agent).toBe("drawing");
    expect(call.body.files[0].id).toBe(up.body.id);
    expect(call.body.input).toEqual({ note: "hi" });

    const list = await api("get", `/jobs/${jobId}/runs`, aliceTok);
    expect(list.body.items).toHaveLength(1);
    expect((await api("get", `/runs/${res.body.id}`, aliceTok)).status).toBe(200);
  });

  it("hides runs from other users", async () => {
    const runId = (await api("get", `/jobs/${jobId}/runs`, aliceTok)).body.items[0].id;
    expect((await api("get", `/runs/${runId}`, bobTok)).status).toBe(404);
    expect((await api("get", `/jobs/${jobId}/runs`, bobTok)).status).toBe(404);
    expect((await api("post", `/jobs/${jobId}/agents/drawing/run`, bobTok)).status).toBe(404);
    expect((await api("post", `/runs/${runId}/cancel`, bobTok)).status).toBe(404);
  });

  it("maps a rejected token, a garbage answer and a timeout to clear errors and records them as failed", async () => {
    const auth = await api("post", `/jobs/${jobId}/agents/selection/run`, aliceTok).send({
      input: { simulate: "auth" },
    });
    expect(auth.status).toBe(502);
    expect(auth.body.error.code).toBe("AI_SERVICE_AUTH_FAILED");

    const bad = await api("post", `/jobs/${jobId}/agents/selection/run`, aliceTok).send({
      input: { simulate: "garbage" },
    });
    expect(bad.status).toBe(502);
    expect(bad.body.error.code).toBe("AI_SERVICE_BAD_RESPONSE");

    const slow = await api("post", `/jobs/${jobId}/agents/selection/run`, aliceTok).send({
      input: { delayMs: 2500 },
    });
    expect(slow.status).toBe(504);
    expect(slow.body.error.code).toBe("AI_SERVICE_TIMEOUT");

    const items = (await api("get", `/jobs/${jobId}/runs`, aliceTok)).body.items as RunItem[];
    const selection = items.filter((r) => r.agent === "selection");
    expect(selection).toHaveLength(3);
    expect(selection.every((r) => r.status === "failed")).toBe(true);
  });

  it("blocks a second run of the same agent and cancels a running one", async () => {
    const pending = api("post", `/jobs/${jobId}/agents/planning/run`, aliceTok)
      .send({ input: { delayMs: 1200 } })
      .then((r) => r);

    let running: RunItem | undefined;
    for (let i = 0; i < 40 && !running; i++) {
      await sleep(50);
      const items = (await api("get", `/jobs/${jobId}/runs`, aliceTok)).body.items as RunItem[];
      running = items.find((r) => r.agent === "planning" && r.status === "running");
    }
    expect(running).toBeTruthy();
    const runningId = (running as RunItem).id;

    const second = await api("post", `/jobs/${jobId}/agents/planning/run`, aliceTok);
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("RUN_IN_PROGRESS");

    const cancelled = await api("post", `/runs/${runningId}/cancel`, aliceTok);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.status).toBe("cancelled");

    const first = await pending;
    expect(first.status).toBe(409);
    expect(first.body.error.code).toBe("RUN_CANCELLED");

    expect((await api("get", `/runs/${runningId}`, aliceTok)).body.status).toBe("cancelled"); // not overwritten
    expect((await api("post", `/runs/${runningId}/cancel`, aliceTok)).status).toBe(409);
  });

  it("marks runs left 'running' by a dead process as interrupted at startup", async () => {
    const { db } = await import("../src/db");
    const { markInterruptedRuns } = await import("../src/runs/repo");
    db.prepare(
      `INSERT INTO agent_runs (id, job_id, agent, status, requested_by, trace_id)
       SELECT 'stale-run', ?, 'cam', 'running', owner_id, 't' FROM jobs WHERE id = ?`,
    ).run(jobId, jobId);

    expect(markInterruptedRuns()).toBe(1);
    expect((await api("get", "/runs/stale-run", aliceTok)).body.status).toBe("interrupted");
  });

  it("reports the AI service in the health check", async () => {
    const res = await api("get", "/system/health");
    expect(res.body.aiService).toBe("ok"); // the fake server answers /health
  });
});
