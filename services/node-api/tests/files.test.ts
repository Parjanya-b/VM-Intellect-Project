import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";

let app: Express;
let dataDir = "";
let adminTok = "";
let aliceTok = "";
let bobTok = "";
let jobId = "";

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

const upload = (token: string | undefined, job: string, buf: Buffer, filename: string) =>
  api("post", `/jobs/${job}/files`, token).attach("file", buf, filename);

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF\n");
const CSV = Buffer.from("a,b\n1,2\n");
const STEP = Buffer.from("ISO-10303-21;\nHEADER;\nENDSEC;\n");
const IGES = Buffer.from("A".repeat(72) + "S      1\n");

beforeAll(async () => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vmi-test-"));
  process.env.VMI_DATA_DIR = dataDir;
  process.env.VMI_MAX_UPLOAD_BYTES = "2048"; // small limit so the "too large" test is quick
  process.env.LOG_LEVEL = "silent";
  const { createApp } = await import("../src/app");
  app = createApp();
  adminTok = await signup("admin1");
  aliceTok = await signup("alice");
  bobTok = await signup("bob");
  const res = await api("post", "/jobs", aliceTok).send({
    title: "Upload test",
    goal: "Testing file uploads",
  });
  jobId = res.body.id;
});

let pdfId = "";
let csvId = "";

// Tests run in order and share state.
describe("files API", () => {
  it("requires sign-in", async () => {
    expect((await upload(undefined, jobId, PDF, "a.pdf")).status).toBe(401);
  });

  it("uploads a pdf, records its sha-256 and moves the job to 'uploaded'", async () => {
    const res = await upload(aliceTok, jobId, PDF, "drawing.pdf");
    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe("drawing.pdf");
    expect(res.body.kind).toBe("pdf");
    expect(res.body.sizeBytes).toBe(PDF.length);
    expect(res.body.sha256).toBe(createHash("sha256").update(PDF).digest("hex"));
    pdfId = res.body.id;

    // stored under the random id, with no extension
    expect(fs.existsSync(path.join(dataDir, "uploads", pdfId))).toBe(true);

    const job = await api("get", `/jobs/${jobId}`, aliceTok);
    expect(job.body.status).toBe("uploaded");
    expect(job.body.files).toHaveLength(1);
  });

  it("rejects the same content again, even under another name", async () => {
    const res = await upload(aliceTok, jobId, PDF, "renamed.pdf");
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_FILE");
  });

  it("rejects a fake pdf (wrong signature)", async () => {
    const res = await upload(aliceTok, jobId, Buffer.from("just some text"), "fake.pdf");
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe("SIGNATURE_MISMATCH");
  });

  it("rejects unsupported extensions, empty files and oversized files", async () => {
    const exe = await upload(aliceTok, jobId, Buffer.from("MZ..."), "virus.exe");
    expect(exe.status).toBe(415);
    expect(exe.body.error.code).toBe("UNSUPPORTED_TYPE");

    const empty = await upload(aliceTok, jobId, Buffer.alloc(0), "empty.csv");
    expect(empty.status).toBe(400);
    expect(empty.body.error.code).toBe("EMPTY_FILE");

    const big = await upload(aliceTok, jobId, Buffer.concat([PDF, Buffer.alloc(4000)]), "big.pdf");
    expect(big.status).toBe(413);
    expect(big.body.error.code).toBe("FILE_TOO_LARGE");
  });

  it("accepts csv, step and iges files", async () => {
    const csv = await upload(aliceTok, jobId, CSV, "table.csv");
    expect(csv.status).toBe(201);
    csvId = csv.body.id;
    expect((await upload(aliceTok, jobId, STEP, "part.step")).status).toBe(201);
    expect((await upload(aliceTok, jobId, IGES, "part.igs")).status).toBe(201);
  });

  it("never uses a client-supplied path", async () => {
    const res = await upload(
      aliceTok,
      jobId,
      Buffer.from("%PDF-1.4\nsecond file\n"),
      "../../evil.pdf",
    );
    expect(res.status).toBe(201);
    expect(res.body.originalName).toBe("evil.pdf");
    expect(fs.existsSync(path.join(dataDir, "uploads", res.body.id))).toBe(true);
    expect(fs.existsSync(path.join(dataDir, "evil.pdf"))).toBe(false);
  });

  it("blocks other users from uploading to, reading or deleting someone else's job/file", async () => {
    expect((await upload(bobTok, jobId, Buffer.from("%PDF-1.4\nbob\n"), "bob.pdf")).status).toBe(
      404,
    );
    expect((await api("get", `/files/${pdfId}/preview`, bobTok)).status).toBe(404);
    expect((await api("delete", `/files/${pdfId}`, bobTok)).status).toBe(404);
    expect((await api("get", `/files/${pdfId}/preview`, adminTok)).status).toBe(200); // admin may read
  });

  it("serves previews and downloads with safe headers", async () => {
    const pdf = await api("get", `/files/${pdfId}/preview`, aliceTok);
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    expect(pdf.headers["content-disposition"]).toContain("inline");
    expect(pdf.headers["x-content-type-options"]).toBe("nosniff");

    const csv = await api("get", `/files/${csvId}/preview`, aliceTok);
    expect(csv.headers["content-disposition"]).toContain("attachment");
    expect(csv.text).toBe(CSV.toString());

    expect(
      (await api("get", `/files/${pdfId}/preview?download=1`, aliceTok)).headers[
        "content-disposition"
      ],
    ).toContain("attachment");
  });

  it("deletes files; the job returns to 'draft' when the last file is gone", async () => {
    const list = (await api("get", `/jobs/${jobId}`, aliceTok)).body.files as { id: string }[];
    for (const f of list) {
      expect((await api("delete", `/files/${f.id}`, aliceTok)).status).toBe(204);
    }
    expect(fs.existsSync(path.join(dataDir, "uploads", pdfId))).toBe(false);
    expect((await api("get", `/files/${pdfId}/preview`, aliceTok)).status).toBe(404);

    const job = await api("get", `/jobs/${jobId}`, aliceTok);
    expect(job.body.files).toHaveLength(0);
    expect(job.body.status).toBe("draft");

    // the same content can be uploaded again after deletion
    expect((await upload(aliceTok, jobId, PDF, "drawing.pdf")).status).toBe(201);
  });
});
