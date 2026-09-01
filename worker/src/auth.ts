import type { Context, Next } from "hono";
import { verifyAccessJwt } from "./lib/jwt";
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

  await env.DB.prepare(
    `INSERT INTO users (email, display_name, created_at, last_seen_at)
     VALUES (?, ?, datetime('now'), datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       display_name = excluded.display_name,
       last_seen_at = datetime('now')`,
  )
    .bind(email, displayName)
    .run();

  c.set("user", { email, displayName });
  await next();
}
