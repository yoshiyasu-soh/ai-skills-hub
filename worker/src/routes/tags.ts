import { Hono } from "hono";
import type { AuthUser, Env } from "../types";

const tags = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

interface TagQueryRow {
  id: number;
  name: string;
  label: string;
  is_default: number;
  created_by: string | null;
  item_count?: number;
}

function toTagDTO(row: TagQueryRow, viewerEmail: string) {
  return {
    id: row.id,
    name: row.name,
    label: row.label,
    is_default: row.is_default,
    item_count: row.item_count,
    isOwner: row.created_by === viewerEmail,
  };
}

// 一覧: デフォルトタグを先頭に、ラベルの五十音/アルファベット順で返す
tags.get("/", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.label, t.is_default, t.created_by, COUNT(it.item_id) as item_count
     FROM tags t
     LEFT JOIN item_tags it ON it.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.is_default DESC, t.label ASC`,
  ).all<TagQueryRow>();
  return c.json({ tags: (results ?? []).map((row) => toTagDTO(row, user.email)) });
});

// 投稿者が投稿時にその場で新規タグを追加できるようにする
tags.post("/", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{ name?: string }>().catch(() => ({}) as { name?: string });
  const label = (body.name ?? "").trim();

  if (!label) return c.json({ error: "name is required" }, 400);
  if (label.length > 30) return c.json({ error: "name is too long (max 30 chars)" }, 400);

  const name = label.toLowerCase();

  const existing = await c.env.DB.prepare(
    "SELECT id, name, label, is_default, created_by FROM tags WHERE name = ?",
  )
    .bind(name)
    .first<TagQueryRow>();
  if (existing) return c.json({ tag: toTagDTO(existing, user.email) });

  const result = await c.env.DB.prepare(
    "INSERT INTO tags (name, label, is_default, created_by) VALUES (?, ?, 0, ?)",
  )
    .bind(name, label, user.email)
    .run();

  return c.json(
    {
      tag: toTagDTO(
        { id: Number(result.meta.last_row_id), name, label, is_default: 0, created_by: user.email },
        user.email,
      ),
    },
    201,
  );
});

// 自分が作成したタグを削除する。デフォルトタグ・他人が作成したタグ・使用中のタグは削除不可。
tags.delete("/:id", async (c) => {
  const user = c.get("user");
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "invalid tag id" }, 400);

  const tag = await c.env.DB.prepare("SELECT id, is_default, created_by FROM tags WHERE id = ?")
    .bind(id)
    .first<{ id: number; is_default: number; created_by: string | null }>();
  if (!tag) return c.json({ error: "not_found" }, 404);

  if (tag.is_default) return c.json({ error: "default tags cannot be deleted" }, 403);
  if (tag.created_by !== user.email) return c.json({ error: "forbidden" }, 403);

  const usage = await c.env.DB.prepare("SELECT COUNT(*) as cnt FROM item_tags WHERE tag_id = ?")
    .bind(id)
    .first<{ cnt: number }>();
  if ((usage?.cnt ?? 0) > 0) {
    return c.json({ error: "this tag is already used by one or more items and cannot be deleted" }, 400);
  }

  await c.env.DB.prepare("DELETE FROM tags WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

export default tags;
