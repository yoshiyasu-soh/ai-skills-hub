import { Hono } from "hono";
import type { AuthUser, Env } from "../types";

const notifications = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

interface NotificationRow {
  item_id: string;
  item_type: string;
  title: string;
  last_seen_version: string;
  current_version: string;
  updated_at: string;
}

// ---- 自分がDL・コピー・お気に入り登録した項目のうち、バージョンが上がっているものの一覧 ----
notifications.get("/", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT i.id as item_id, i.type as item_type, i.title as title,
            w.last_seen_version as last_seen_version, i.version as current_version,
            i.updated_at as updated_at
     FROM item_watches w
     JOIN items i ON i.id = w.item_id
     WHERE w.user_email = ? AND w.last_seen_version != i.version
     ORDER BY i.updated_at DESC
     LIMIT 50`,
  )
    .bind(user.email)
    .all<NotificationRow>();

  const list = (results ?? []).map((r) => ({
    itemId: r.item_id,
    itemType: r.item_type,
    title: r.title,
    previousVersion: r.last_seen_version,
    currentVersion: r.current_version,
    updatedAt: r.updated_at,
  }));

  return c.json({ notifications: list, unreadCount: list.length });
});

// ---- 保留中の更新通知をすべて既読にする ----
notifications.post("/read-all", async (c) => {
  const user = c.get("user");
  await c.env.DB.prepare(
    `UPDATE item_watches
     SET last_seen_version = (SELECT i.version FROM items i WHERE i.id = item_watches.item_id),
         updated_at = datetime('now')
     WHERE user_email = ?
       AND last_seen_version != (SELECT i.version FROM items i WHERE i.id = item_watches.item_id)`,
  )
    .bind(user.email)
    .run();

  return c.json({ ok: true });
});

export default notifications;
