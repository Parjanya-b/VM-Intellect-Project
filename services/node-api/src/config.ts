import path from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_UPLOAD_BYTES } from "@vmi/contracts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");
const dataDir = process.env.VMI_DATA_DIR ?? path.join(repoRoot, ".data");

export const config = {
  host: "127.0.0.1", // loopback ONLY. Never 0.0.0.0.
  port: Number(process.env.VMI_API_PORT ?? 4000),
  dataDir,
  uploadsDir: path.join(dataDir, "uploads"),
  tempDir: path.join(dataDir, "temp"),
  migrationsDir: process.env.VMI_MIGRATIONS_DIR ?? path.join(repoRoot, "database", "migrations"),
  maxUploadBytes: Number(process.env.VMI_MAX_UPLOAD_BYTES ?? MAX_UPLOAD_BYTES),
  sessionHours: 12,
  maxFailedAttempts: 5,
  lockMinutes: 5,
};
