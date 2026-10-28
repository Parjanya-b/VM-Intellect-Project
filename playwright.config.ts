import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "vmi-e2e-"));

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure" },
  webServer: [
    {
      command: "pnpm --filter @vmi/node-api dev",
      url: "http://127.0.0.1:4000/api/v1/system/health",
      reuseExistingServer: false,
      env: { VMI_DATA_DIR: dataDir, LOG_LEVEL: "warn" },
    },
    {
      command: "pnpm --filter @vmi/web-ui dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
    },
  ],
});
