import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../types";

// Team domain ごとに JWKS(公開鍵セット)を isolate 内でキャッシュして使い回す。
// jose の createRemoteJWKSet 自体が内部的に取得結果をキャッシュ・再検証してくれる。
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJWKS(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

export interface AccessIdentity {
  email: string;
  name?: string;
}

/**
 * Cloudflare Access が付与する `Cf-Access-Jwt-Assertion` ヘッダの JWT を検証する。
 * 署名・有効期限・audience(Access アプリの AUD Tag)が正しい場合のみ identity を返す。
 */
export async function verifyAccessJwt(token: string, env: Env): Promise<AccessIdentity | null> {
  const jwks = getJWKS(env.ACCESS_TEAM_DOMAIN);
  const { payload } = await jwtVerify(token, jwks, {
    audience: env.ACCESS_AUD,
  });

  const email = typeof payload.email === "string" ? payload.email : undefined;
  if (!email) return null;

  const name = typeof payload["name"] === "string" ? (payload["name"] as string) : undefined;
  return { email, name };
}
