import { Hono } from "hono";
import { toItemDTOs } from "../lib/items";
import type { AuthUser, Env, ItemRow, RankingPeriod } from "../types";

const ranking = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// GET /api/ranking?type=skill|prompt&period=all|7d|30d&limit=20
// DL数(スキル)/コピー数(プロンプト)を usage_count / usage_events から集計してランキング表示する
ranking.get("/", async (c) => {
  const user = c.get("user");
  const typeParam = c.req.query("type");
  const typeFilter = typeParam === "skill" || typeParam === "prompt" ? typeParam : undefined;
  const period = (c.req.query("period") as RankingPeriod) || "all";
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") ?? "20") || 20));

  if (period === "all") {
    const where = typeFilter ? "WHERE i.type = ?" : "";
    const params = typeFilter ? [typeFilter] : [];

    const { results } = await c.env.DB.prepare(
      `SELECT i.*, u.display_name as author_display_name
       FROM items i JOIN users u ON u.email = i.author_email
       ${where}
       ORDER BY i.usage_count DESC
       LIMIT ?`,
    )
      .bind(...params, limit)
      .all<ItemRow & { author_display_name: string }>();

    const dtos = await toItemDTOs(c.env.DB, results ?? [], user.email);
    const items = dtos.map((dto) => ({ ...dto, periodCount: dto.usageCount }));
    return c.json({ items, period, type: typeFilter ?? "all" });
  }

  const days = period === "7d" ? 7 : 30;
  const typeJoin = typeFilter ? "JOIN items it ON it.id = e.item_id AND it.type = ?" : "";
  const typeJoinParams = typeFilter ? [typeFilter] : [];

  const { results: eventCounts } = await c.env.DB.prepare(
    `SELECT e.item_id as item_id, COUNT(*) as cnt
     FROM usage_events e
     ${typeJoin}
     WHERE e.created_at >= datetime('now', ?)
     GROUP BY e.item_id
     ORDER BY cnt DESC
     LIMIT ?`,
  )
    .bind(...typeJoinParams, `-${days} days`, limit)
    .all<{ item_id: string; cnt: number }>();

  const rows = eventCounts ?? [];
  if (rows.length === 0) return c.json({ items: [], period, type: typeFilter ?? "all" });

  const ids = rows.map((r) => r.item_id);
  const placeholders = ids.map(() => "?").join(",");

  const { results: itemRows } = await c.env.DB.prepare(
    `SELECT i.*, u.display_name as author_display_name
     FROM items i JOIN users u ON u.email = i.author_email
     WHERE i.id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<ItemRow & { author_display_name: string }>();

  const dtos = await toItemDTOs(c.env.DB, itemRows ?? [], user.email);
  const countByItem = new Map(rows.map((r) => [r.item_id, r.cnt]));
  const items = dtos
    .map((dto) => ({ ...dto, periodCount: countByItem.get(dto.id) ?? 0 }))
    .sort((a, b) => b.periodCount - a.periodCount);

  return c.json({ items, period, type: typeFilter ?? "all" });
});

export default ranking;
