-- DL・コピー・お気に入り登録した項目についてバージョン更新に気づけるようにするための購読テーブル。
-- 各操作の際に「その時点のバージョン」を記録し、投稿者がバージョンを上げると
-- last_seen_version と items.version の不一致から「更新あり」を判定できる。
CREATE TABLE IF NOT EXISTS item_watches (
  user_email TEXT NOT NULL REFERENCES users(email) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  last_seen_version TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_email, item_id)
);

CREATE INDEX IF NOT EXISTS idx_item_watches_item ON item_watches(item_id);
