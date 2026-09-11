import type { Context, Next } from "hono";
import { verifyAccessJwt } from "./lib/jwt";
import { isProfileStale, syncUserProfile } from "./lib/userProfile";
import type { AuthUser, Env } from "./types";

type AppContext = Context<{ Bindings: Env; Variables: { user: AuthUser } }>;

/**
 * Cloudflare Access が付与する Cf-Access-Jwt-Assertion を検証し、
 * users テーブルへ upsert した上で Hono context に user を積む。
 * ENVIRONMENT != production かつ DEV_BYPASS_EMAIL が設定されている場合のみ、
 * ローカル開発用に認証をバイパスできる(本番の wrangler.jsonc には設定しないこと)。
 */
export async function authMiddleware(c: AppContext, next: Next) {
  const env = c.env;
  let email: string | undefined;
  let name: string | undefined;

  const token = c.req.header("Cf-Access-Jwt-Assertion");
  if (token) {
    try {
      const identity = await verifyAccessJwt(token, env);
      if (identity) {
        email = identity.email;
        name = identity.name;
      }
    } catch (err) {
      console.error("Access JWT verification failed:", err);
    }
  }

  if (!email && env.ENVIRONMENT !== "production" && env.DEV_BYPASS_EMAIL) {
    email = env.DEV_BYPASS_EMAIL;
    name = env.DEV_BYPASS_EMAIL.split("@")[0];
  }

  if (!email) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const displayName = name ?? email.split("@")[0];

  // display_name は初回ログイン時のフォールバック値として入れるだけで、
  // 以降は Microsoft Graph からの同期(syncUserProfile)が正となる値を更新する。
  await env.DB.prepare(
    `INSERT INTO users (email, display_name, created_at, last_seen_at)
     VALUES (?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(email) DO UPDATE SET last_seen_at = datetime('now')`,
  )
    .bind(email, displayName)
    .run();

  const profileRow = await env.DB.prepare("SELECT profile_synced_at FROM users WHERE email = ?")
    .bind(email)
    .first<{ profile_synced_at: string | null }>();

  if (!profileRow?.profile_synced_at) {
    // 初回は表示名等がすぐ反映されるよう、同期完了を待ってからレスポンスする
    await syncUserProfile(env, email).catch((err) => console.error("initial Entra profile sync failed:", err));
  } else if (isProfileStale(profileRow.profile_synced_at)) {
    // 同期済みならレスポンスはブロックせず、バックグラウンドで再同期する
    c.executionCtx.waitUntil(
      syncUserProfile(env, email).catch((err) => console.error("background Entra profile sync failed:", err)),
    );
  }

  c.set("user", { email, displayName });
  await next();
}
