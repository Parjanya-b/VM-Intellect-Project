import { randomBytes } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vmi-e2e-"));
const token = `e2e-${randomBytes(16).toString("hex")}`;
const shared = { VMI_DATA_DIR: dataDir, VMI_SERVICE_TOKEN: token };

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  projects: [
    { name: "setup", testMatch: /auth\.spec\.ts/ },
    { name: "e2e", testIgnore: /auth\.spec\.ts/, dependencies: ["setup"] },
  ],
  webServer: [
    {
      command: "pnpm --filter @vmi/python-ai dev",
      url: "http://127.0.0.1:8001/health",
      reuseExistingServer: false,
      timeout: 120_000, // the first run may download Python and packages
      env: shared,
    },
    {
      command: "pnpm --filter @vmi/node-api dev",
      url: "http://127.0.0.1:4000/api/v1/system/health",
      reuseExistingServer: false,
      env: { ...shared, LOG_LEVEL: "warn" },
    },
    {
      command: "pnpm --filter @vmi/web-ui dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
