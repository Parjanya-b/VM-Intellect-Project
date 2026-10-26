import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "../../..");

export const config = {
  host: "127.0.0.1", // loopback ONLY. Never 0.0.0.0.
  port: Number(process.env.VMI_API_PORT ?? 4000),
  // In production, Tauri will pass the OS app-data folder here.
  dataDir: process.env.VMI_DATA_DIR ?? path.join(repoRoot, ".data"),
  migrationsDir: process.env.VMI_MIGRATIONS_DIR ?? path.join(repoRoot, "database", "migrations"),
  sessionHours: 12,
  maxFailedAttempts: 5,
  lockMinutes: 5,
};
