-- 対象プラットフォーム/エージェント環境を表すデフォルトタグを追加
INSERT OR IGNORE INTO tags (name, label, is_default) VALUES
  ('claude', 'Claude', 1),
  ('chatgpt', 'ChatGPT', 1),
  ('gemini', 'Gemini', 1),
  ('microsoft copilot', 'Microsoft Copilot', 1),
  ('claude code', 'Claude Code', 1),
  ('codex', 'Codex', 1),
  ('antigravity', 'Antigravity', 1);
