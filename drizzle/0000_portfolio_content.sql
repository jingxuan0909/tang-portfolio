-- Legacy Sites table: one fixed row stores the complete portfolio JSON document.
CREATE TABLE IF NOT EXISTS portfolio_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
