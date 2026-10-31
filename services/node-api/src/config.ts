import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_UPLOAD_BYTES } from "@vmi/contracts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

// Load <repo>/.env if it exists. Variables that are already set are never overridden.
try {
  process.loadEnvFile(path.join(repoRoot, ".env"));
} catch {
  /* no .env file: fine */
}

const dataDir = process.env.VMI_DATA_DIR ?? path.join(repoRoot, ".data");
const pythonUrl = process.env.VMI_PYTHON_URL ?? "http://127.0.0.1:8001";

// Fail closed: the AI service must be on this computer.
if (!["127.0.0.1", "localhost", "[::1]"].includes(new URL(pythonUrl).hostname)) {
  throw new Error(`VMI_PYTHON_URL must point to this computer (loopback), got: ${pythonUrl}`);
}

export const config = {
  host: "127.0.0.1", // loopback ONLY. Never 0.0.0.0.
  port: Number(process.env.VMI_API_PORT ?? 4000),
  dataDir,
  uploadsDir: path.join(dataDir, "uploads"),
  tempDir: path.join(dataDir, "temp"),
  migrationsDir: process.env.VMI_MIGRATIONS_DIR ?? path.join(repoRoot, "database", "migrations"),
  maxUploadBytes: Number(process.env.VMI_MAX_UPLOAD_BYTES ?? MAX_UPLOAD_BYTES),
  pythonUrl,
  pythonTimeoutMs: Number(process.env.VMI_PYTHON_TIMEOUT_MS ?? 120_000),
  serviceToken: process.env.VMI_SERVICE_TOKEN || undefined,
  sessionHours: 12,
  maxFailedAttempts: 5,
  lockMinutes: 5,
};
