CREATE TABLE agent_runs (
  id            TEXT PRIMARY KEY,
  job_id        TEXT NOT NULL REFERENCES jobs(id),
  agent         TEXT NOT NULL CHECK (agent IN
                ('understanding','drawing','selection','planning','cam','simulation','optimization','reporting')),
  status        TEXT NOT NULL CHECK (status IN
                ('running','completed','needs_review','failed','interrupted','cancelled')),
  requested_by  TEXT NOT NULL REFERENCES users(id),
  input_json    TEXT NOT NULL DEFAULT '{}',   -- input references: file ids + parameters
  output_json   TEXT,
  warnings_json TEXT NOT NULL DEFAULT '[]',
  error_message TEXT,
  model_version TEXT,
  duration_ms   INTEGER,
  trace_id      TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  finished_at   TEXT
);
CREATE INDEX idx_runs_job ON agent_runs(job_id, created_at DESC);
