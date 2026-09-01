-- AI Skills Hub - initial schema (D1 / SQLite)

CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('skill', 'prompt')),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '', -- prompt text (type='prompt') or usage notes (type='skill')
  r2_key TEXT, -- skill zip object key in R2; null for prompts
  file_name TEXT,
  file_size INTEGER,
  version TEXT NOT NULL DEFAULT '1.0.0',
  author_email TEXT NOT NULL REFERENCES users(email),
  usage_count INTEGER NOT NULL DEFAULT 0, -- downloads (skill) or copies (prompt)
  favorite_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON items(created_at);
CREATE INDEX IF NOT EXISTS idx_items_usage_count ON items(usage_count);
CREATE INDEX IF NOT EXISTS idx_items_author ON items(author_email);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE, -- normalized lowercase
  label TEXT NOT NULL, -- display form
  is_default INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(email),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS item_tags (
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_item_tags_tag ON item_tags(tag_id);

CREATE TABLE IF NOT EXISTS favorites (
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_email, item_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id);

CREATE TABLE IF NOT EXISTS usage_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_email TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('download', 'copy')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_events_item_created ON usage_events(item_id, created_at);

-- Seed default tags
INSERT OR IGNORE INTO tags (name, label, is_default) VALUES
  ('coding', 'コーディング', 1),
  ('review', 'レビュー', 1),
  ('documentation', 'ドキュメント', 1),
  ('testing', 'テスト', 1),
  ('infra', 'インフラ', 1),
  ('data', 'データ分析', 1),
  ('writing', 'ライティング', 1),
  ('productivity', '生産性', 1),
  ('security', 'セキュリティ', 1),
  ('other', 'その他', 1);
