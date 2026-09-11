import { Hono } from "hono";
import { fetchUserProfileRow, syncUserProfile, toUserProfileDTO } from "../lib/userProfile";
import type { AuthUser, Env } from "../types";

const users = new Hono<{ Bindings: Env; Variables: { user: AuthUser } }>();

// 投稿者など、社内の任意のユーザーのプロフィール(表示名・役職・部署等)を閲覧できる。
// 認証済みユーザーであれば誰でも閲覧可能(/api/* は authMiddleware で保護済み)。
users.get("/:email", async (c) => {
  const email = decodeURIComponent(c.req.param("email"));
  const row = await fetchUserProfileRow(c.env.DB, email);
  if (!row) return c.json({ error: "not_found" }, 404);
  return c.json({ user: toUserProfileDTO(row) });
});

// Microsoft Graph との手動再同期(「今すぐ更新」ボタン用)
users.post("/:email/sync", async (c) => {
  const email = decodeURIComponent(c.req.param("email"));
  const exists = await c.env.DB.prepare("SELECT email FROM users WHERE email = ?").bind(email).first();
  if (!exists) return c.json({ error: "not_found" }, 404);

  const profile = await syncUserProfile(c.env, email);

  const row = await fetchUserProfileRow(c.env.DB, email);
  if (!row) return c.json({ error: "internal_error" }, 500);
  return c.json({ user: toUserProfileDTO(row), synced: profile !== null });
});

export default users;
