import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FILE_TYPES, fileKindFor, type JobFile, type PublicUser } from "@vmi/contracts";
import { config } from "../config";
import { db } from "../db";
import { AppError } from "../errors";
import { audit } from "../audit";
import { requireAuth } from "../auth/session";
import { assertCanEdit, loadJob } from "./jobs";
import { FILE_COLUMNS, toJobFile, type FileRow } from "../files/repo";
import { hasValidSignature, readHead } from "../files/signature";
import { cleanName, sha256File } from "../files/util";

export const filesRouter = Router();

fs.mkdirSync(config.uploadsDir, { recursive: true });
fs.mkdirSync(config.tempDir, { recursive: true });

const NOW = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";
const extOf = (name: string) => path.extname(name).slice(1).toLowerCase();

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.tempDir),
    filename: (_req, _file, cb) => cb(null, randomUUID()), // random temp name; the client name is never used
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = extOf(file.originalname);
    if (!fileKindFor(ext)) {
      return cb(
        new AppError(
          415,
          "UNSUPPORTED_TYPE",
          `.${ext || "?"} files are not supported. Allowed: ${Object.keys(FILE_TYPES).join(", ")}.`,
        ),
      );
    }
    cb(null, true);
  },
});

function receive(
  req: Parameters<ReturnType<typeof upload.single>>[0],
  res: Parameters<ReturnType<typeof upload.single>>[1],
) {
  return new Promise<Express.Multer.File>((resolve, reject) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          const mb = Math.round(config.maxUploadBytes / 1024 / 1024);
          return reject(
            new AppError(413, "FILE_TOO_LARGE", `The file is larger than the ${mb} MB limit.`),
          );
        }
        return reject(new AppError(400, "UPLOAD_ERROR", "The upload could not be read."));
      }
      if (err) return reject(err);
      if (!req.file) {
        return reject(
          new AppError(400, "NO_FILE", "No file was sent (the field name must be 'file')."),
        );
      }
      resolve(req.file);
    });
  });
}

filesRouter.post("/jobs/:id/files", requireAuth, async (req, res) => {
  const user = res.locals.user as PublicUser;
  // Check access BEFORE reading the upload body.
  const job = loadJob(req.params.id as string, user);
  assertCanEdit(job, user);
  if (job.status === "queued" || job.status === "processing") {
    throw new AppError(409, "JOB_BUSY", "This job is being processed. Try again when it finishes.");
  }

  const tmp = await receive(req, res);
  const fileId = randomUUID();
  const dest = path.join(config.uploadsDir, fileId);

  try {
    const ext = extOf(tmp.originalname);
    const kind = fileKindFor(ext);
    if (!kind) throw new AppError(415, "UNSUPPORTED_TYPE", "This file type is not supported.");
    if (tmp.size === 0) throw new AppError(400, "EMPTY_FILE", "The file is empty.");
    if (!hasValidSignature(ext, readHead(tmp.path))) {
      throw new AppError(
        415,
        "SIGNATURE_MISMATCH",
        `This file does not look like a real .${ext} file.`,
      );
    }

    const sha = await sha256File(tmp.path);
    const dup = db
      .prepare(
        "SELECT original_name FROM files WHERE job_id = ? AND sha256 = ? AND deleted_at IS NULL",
      )
      .get(job.id, sha) as { original_name: string } | undefined;
    if (dup) {
      throw new AppError(
        409,
        "DUPLICATE_FILE",
        `This file was already uploaded to this job as "${dup.original_name}".`,
      );
    }

    fs.renameSync(tmp.path, dest);
    try {
      db.transaction(() => {
        db.prepare(
          `INSERT INTO files (id, job_id, uploaded_by, original_name, format, kind, size_bytes, sha256)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(fileId, job.id, user.id, cleanName(tmp.originalname), ext, kind, tmp.size, sha);
        db.prepare(
          `UPDATE jobs SET status = CASE WHEN status = 'draft' THEN 'uploaded' ELSE status END,
                           updated_at = ${NOW} WHERE id = ?`,
        ).run(job.id);
      })();
    } catch (e) {
      fs.rmSync(dest, { force: true });
      if ((e as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
        throw new AppError(409, "DUPLICATE_FILE", "This file was already uploaded to this job.");
      }
      throw e;
    }

    audit(user.id, "file.upload", res.locals.traceId, `${job.id}/${fileId}`);
    const row = db.prepare(`SELECT ${FILE_COLUMNS} FROM files WHERE id = ?`).get(fileId) as FileRow;
    const body: JobFile = toJobFile(row);
    res.status(201).json(body);
  } finally {
    fs.rmSync(tmp.path, { force: true }); // no-op when the file was moved
  }
});
