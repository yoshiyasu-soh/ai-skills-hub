export interface ParsedSkillMd {
  title?: string;
  summary?: string;
  description?: string;
  body: string;
}

/**
 * SKILL.md(YAMLフロントマター + Markdown本文)から投稿フォーム用の値を抽出する。
 * フロントマターの `name` / `description` をタイトル・概要に、
 * フロントマターを除いた本文をそのまま使い方メモ(body)に割り当てる。
 * フロントマターが無い場合は先頭の `# 見出し` をタイトル候補として使う。
 */
export function parseSkillMd(raw: string): ParsedSkillMd {
  let content = raw.replace(/\r\n/g, "\n");
  let name: string | undefined;
  let description: string | undefined;

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (frontmatterMatch) {
    const block = frontmatterMatch[1];
    content = content.slice(frontmatterMatch[0].length);

    for (const line of block.split("\n")) {
      const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!m) continue;
      const key = m[1].trim().toLowerCase();
      const value = m[2].trim().replace(/^["'](.*)["']$/, "$1");
      if (key === "name" && value) name = value;
      if (key === "description" && value) description = value;
    }
  }

  content = content.trim();

  if (!name) {
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) name = headingMatch[1].trim();
  }

  return {
    title: name,
    summary: description,
    description,
    body: content,
  };
}
