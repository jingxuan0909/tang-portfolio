// Legacy Sites database schema: one row stores the complete portfolio document.
export const portfolioContentSchema = `CREATE TABLE IF NOT EXISTS portfolio_content (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  content_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;
