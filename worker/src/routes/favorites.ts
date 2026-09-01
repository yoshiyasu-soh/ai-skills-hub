import { Hono } from "hono";
import { toItemDTOs } from "../lib/items";
import type { AuthUser, Env, ItemRow } from "../types";

const favorites = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

favorites.get("/", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT i.*, u.display_name as author_display_name
     FROM favorites f
     JOIN items i ON i.id = f.item_id
     JOIN users u ON u.email = i.author_email
     WHERE f.user_email = ?
     ORDER BY f.created_at DESC`,
  )
    .bind(user.email)
    .all<ItemRow & { author_display_name: string }>();

  const items = await toItemDTOs(c.env.DB, results ?? [], user.email);
  return c.json({ items });
});

export default favorites;
