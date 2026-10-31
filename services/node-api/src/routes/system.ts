import { Router } from "express";
import type { HealthResponse } from "@vmi/contracts";
import { db } from "../db";
import { pingPython } from "../python/client";

export const systemRouter = Router();

systemRouter.get("/health", async (_req, res) => {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  const { v } = db
    .prepare("SELECT COALESCE(MAX(version), 0) AS v FROM schema_migrations")
    .get() as {
    v: number;
  };

  const body: HealthResponse = {
    status: "ok",
    offlineReady: true, // PLACEHOLDER: real check comes with /setup + bundle verification
    coreBundleVersion: null, // comes from bundle_manifest in Phase 3/4
    lastBackupAt: null, // comes from the backup module in Phase 4
    schemaVersion: v,
    hasUsers: n > 0,
    aiService: await pingPython(),
  };
  res.json(body);
});
