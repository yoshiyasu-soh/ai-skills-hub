import type { ItemRow } from "../types";

export interface ItemDTO {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  body: string;
  fileName: string | null;
  fileSize: number | null;
  version: string;
  authorEmail: string;
  authorName: string;
  usageCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  tags: { id: number; name: string; label: string }[];
  isFavorited: boolean;
  isOwner: boolean;
}

type RowWithAuthor = ItemRow & { author_display_name?: string };

/**
 * items テーブルの行配列を、タグ・お気に入り状態を付与した DTO に変換する。
 * N+1 を避けるため、対象アイテムIDをまとめてタグ/お気に入りテーブルに問い合わせる。
 */
export async function toItemDTOs(
  db: D1Database,
  rows: RowWithAuthor[],
  viewerEmail: string,
): Promise<ItemDTO[]> {
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const idPlaceholders = ids.map(() => "?").join(",");

  const tagRowsResult = await db
    .prepare(
      `SELECT it.item_id as item_id, t.id as tag_id, t.name as name, t.label as label
       FROM item_tags it JOIN tags t ON t.id = it.tag_id
       WHERE it.item_id IN (${idPlaceholders})`,
    )
    .bind(...ids)
    .all<{ item_id: string; tag_id: number; name: string; label: string }>();

  const favRowsResult = await db
    .prepare(
      `SELECT item_id FROM favorites WHERE user_email = ? AND item_id IN (${idPlaceholders})`,
    )
    .bind(viewerEmail, ...ids)
    .all<{ item_id: string }>();

  const tagsByItem = new Map<string, { id: number; name: string; label: string }[]>();
  for (const t of tagRowsResult.results ?? []) {
    const list = tagsByItem.get(t.item_id) ?? [];
    list.push({ id: t.tag_id, name: t.name, label: t.label });
    tagsByItem.set(t.item_id, list);
  }

  const favSet = new Set((favRowsResult.results ?? []).map((f) => f.item_id));

  return rows.map((r) => ({
    id: r.id,
    type: r.type,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    description: r.description,
    body: r.body,
    fileName: r.file_name,
    fileSize: r.file_size,
    version: r.version,
    authorEmail: r.author_email,
    authorName: r.author_display_name ?? r.author_email.split("@")[0],
    usageCount: r.usage_count,
    favoriteCount: r.favorite_count,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    tags: tagsByItem.get(r.id) ?? [],
    isFavorited: favSet.has(r.id),
    isOwner: r.author_email === viewerEmail,
  }));
}

export async function fetchItemRow(db: D1Database, id: string): Promise<RowWithAuthor | null> {
  return db
    .prepare(
      `SELECT i.*, u.display_name as author_display_name
       FROM items i JOIN users u ON u.email = i.author_email
       WHERE i.id = ?`,
    )
    .bind(id)
    .first<RowWithAuthor>();
}

/**
 * multipart/form-data の tagIds フィールドを number[] に正規化する。
 * JSON配列文字列("[1,2]")・単一値・同名複数フィールドのいずれにも対応する。
 */
export function parseTagIds(raw: unknown): number[] {
  if (raw == null) return [];
  const values = Array.isArray(raw) ? raw : [raw];
  const ids: number[] = [];

  for (const v of values) {
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          for (const p of parsed) {
            const n = Number(p);
            if (Number.isFinite(n)) ids.push(n);
          }
          continue;
        }
      } catch {
        // JSON以外の文字列だった場合は下の数値変換にフォールバックする
      }
    }
    const n = Number(trimmed);
    if (Number.isFinite(n)) ids.push(n);
  }

  return Array.from(new Set(ids));
}
