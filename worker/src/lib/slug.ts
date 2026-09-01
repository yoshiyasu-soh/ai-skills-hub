/**
 * タイトルから URL 用の slug を生成する。日本語タイトルにも対応するため、
 * 可読性より一意性を優先し、末尾にランダムサフィックスを必ず付与する。
 */
export function slugify(title: string): string {
  // 許可する文字: 半角英数, ひらがな(぀-ゟ), カタカナ(゠-ヿ),
  // CJK統合漢字(一-鿿), ハイフン
  const allowed = /[^a-z0-9぀-ゟ゠-ヿ一-鿿-]+/g;

  const base = title
    .trim()
    .toLowerCase()
    .replace(allowed, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

  const suffix = crypto.randomUUID().slice(0, 8);
  return base ? `${base}-${suffix}` : suffix;
}
