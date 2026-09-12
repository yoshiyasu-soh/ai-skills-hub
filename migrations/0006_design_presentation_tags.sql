-- デフォルトタグに「デザイン」「プレゼン」を追加
INSERT OR IGNORE INTO tags (name, label, is_default) VALUES
  ('design', 'デザイン', 1),
  ('presentation', 'プレゼン', 1);
