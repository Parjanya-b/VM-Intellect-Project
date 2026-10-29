CREATE TABLE jobs (
  id               TEXT PRIMARY KEY,
  owner_id         TEXT NOT NULL REFERENCES users(id),
  title            TEXT NOT NULL,
  goal             TEXT NOT NULL,
  constraints_json TEXT NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','uploaded','queued','processing','needs_review','completed','failed','interrupted')),
  revision         INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  archived_at      TEXT
);
CREATE INDEX idx_jobs_owner  ON jobs(owner_id, archived_at, updated_at DESC);
CREATE INDEX idx_jobs_status ON jobs(status);
