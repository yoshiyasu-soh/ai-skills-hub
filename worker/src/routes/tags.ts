import { Hono } from "hono";
import type { AuthUser, Env } from "../types";

const tags = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// 一覧: デフォルトタグを先頭に、ラベルの五十音/アルファベット順で返す
tags.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.name, t.label, t.is_default, COUNT(it.item_id) as item_count
     FROM tags t
     LEFT JOIN item_tags it ON it.tag_id = t.id
     GROUP BY t.id
     ORDER BY t.is_default DESC, t.label ASC`,
  ).all();
  return c.json({ tags: results ?? [] });
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
    "SELECT id, name, label, is_default FROM tags WHERE name = ?",
  )
    .bind(name)
    .first();
  if (existing) return c.json({ tag: existing });

  const result = await c.env.DB.prepare(
    "INSERT INTO tags (name, label, is_default, created_by) VALUES (?, ?, 0, ?)",
  )
    .bind(name, label, user.email)
    .run();

  return c.json(
    { tag: { id: result.meta.last_row_id, name, label, is_default: 0 } },
    201,
  );
});

export default tags;
