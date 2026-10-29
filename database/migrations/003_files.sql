CREATE TABLE files (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id),
  uploaded_by   TEXT NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,
  format        TEXT NOT NULL,
  kind          TEXT NOT NULL CHECK (kind IN ('pdf','image','spreadsheet','cad')),
  size_bytes    INTEGER NOT NULL,
  sha256        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'stored' CHECK (status IN ('stored','processing','processed','failed')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  deleted_at    TEXT
);
CREATE INDEX idx_files_job ON files(job_id);
-- Same content cannot be stored twice in one job. This also stops duplicate-upload races.
CREATE UNIQUE INDEX idx_files_job_sha ON files(job_id, sha256) WHERE deleted_at IS NULL;
