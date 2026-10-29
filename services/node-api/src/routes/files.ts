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

const CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Find a file the user may access. Errors are always a plain 404. */
function loadFile(id: string, user: PublicUser) {
  const file = db
    .prepare(`SELECT ${FILE_COLUMNS} FROM files WHERE id = ? AND deleted_at IS NULL`)
    .get(id) as FileRow | undefined;
  if (!file) throw new AppError(404, "FILE_NOT_FOUND", "File not found.");
  try {
    return { file, job: loadJob(file.job_id, user) };
  } catch {
    throw new AppError(404, "FILE_NOT_FOUND", "File not found.");
  }
}

filesRouter.get("/files/:id/preview", requireAuth, (req, res, next) => {
  const { file } = loadFile(req.params.id as string, res.locals.user as PublicUser);
  const abs = path.join(config.uploadsDir, file.id); // path comes from the DB id only
  if (!fs.existsSync(abs))
    throw new AppError(404, "FILE_MISSING", "The stored file is missing on disk.");

  const inlineOk = file.kind === "pdf" || file.kind === "image";
  const asDownload = req.query.download === "1" || !inlineOk;
  res.setHeader("Content-Type", CONTENT_TYPES[file.format] ?? "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `${asDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.original_name)}`,
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "private, no-store");
  // dotfiles: "allow" because the data folder path contains ".data"
  res.sendFile(abs, { dotfiles: "allow" }, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

filesRouter.delete("/files/:id", requireAuth, (req, res) => {
  const user = res.locals.user as PublicUser;
  const { file, job } = loadFile(req.params.id as string, user);
  assertCanEdit(job, user);
  if (job.status === "queued" || job.status === "processing") {
    throw new AppError(409, "JOB_BUSY", "This job is being processed. Try again when it finishes.");
  }

  db.transaction(() => {
    db.prepare(`UPDATE files SET deleted_at = ${NOW} WHERE id = ?`).run(file.id);
    const { n } = db
      .prepare("SELECT COUNT(*) AS n FROM files WHERE job_id = ? AND deleted_at IS NULL")
      .get(job.id) as { n: number };
    db.prepare(
      `UPDATE jobs SET status = CASE WHEN status = 'uploaded' AND ? = 0 THEN 'draft' ELSE status END,
                       updated_at = ${NOW} WHERE id = ?`,
    ).run(n, job.id);
  })();
  fs.rmSync(path.join(config.uploadsDir, file.id), { force: true });

  audit(user.id, "file.delete", res.locals.traceId, `${job.id}/${file.id}`);
  res.status(204).end();
});
