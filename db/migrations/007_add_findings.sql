CREATE TABLE IF NOT EXISTS finding (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'disputed', 'withdrawn')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS finding_assertion (
  finding_id TEXT NOT NULL,
  assertion_id TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (finding_id, assertion_id),
  FOREIGN KEY (finding_id) REFERENCES finding(id) ON DELETE CASCADE,
  FOREIGN KEY (assertion_id) REFERENCES assertion(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_finding_status ON finding(status);
CREATE INDEX IF NOT EXISTS idx_finding_assertion_assertion ON finding_assertion(assertion_id);
