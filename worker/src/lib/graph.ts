import type { Env } from "../types";

interface CachedToken {
  token: string;
  expiresAt: number;
}

// isolate内でアプリ専用トークン(client credentials)を使い回すためのキャッシュ
const tokenCache = new Map<string, CachedToken>();

async function getGraphToken(env: Env): Promise<string | null> {
  if (!env.ENTRA_TENANT_ID || !env.ENTRA_CLIENT_ID || !env.ENTRA_CLIENT_SECRET) {
    return null;
  }

  const cached = tokenCache.get(env.ENTRA_TENANT_ID);
  const now = Date.now();
  if (cached && cached.expiresAt - 60_000 > now) {
    return cached.token;
  }

  const res = await fetch(`https://login.microsoftonline.com/${env.ENTRA_TENANT_ID}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.ENTRA_CLIENT_ID,
      client_secret: env.ENTRA_CLIENT_SECRET,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });

  if (!res.ok) {
    console.error("Graph token request failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache.set(env.ENTRA_TENANT_ID, { token: data.access_token, expiresAt: now + data.expires_in * 1000 });
  return data.access_token;
}

export interface GraphProfile {
  displayName: string | null;
  givenName: string | null;
  surname: string | null;
  jobTitle: string | null;
  companyName: string | null;
  department: string | null;
  employeeType: string | null;
}

/**
 * Microsoft Graph (アプリ専用権限 User.Read.All) からユーザープロフィールを取得する。
 * 未設定・権限未同意・対象ユーザーが見つからない等の場合は null を返し、呼び出し元で
 * 既存のフォールバック表示(メールのユーザー名部分等)を継続できるようにする。
 */
export async function fetchGraphProfile(env: Env, email: string): Promise<GraphProfile | null> {
  const token = await getGraphToken(env);
  if (!token) return null;

  const select = "displayName,givenName,surname,jobTitle,companyName,department,employeeType";
  const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=${select}`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error("Graph user lookup failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const data = (await res.json()) as Record<string, unknown>;
  const asString = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

  return {
    displayName: asString(data.displayName),
    givenName: asString(data.givenName),
    surname: asString(data.surname),
    jobTitle: asString(data.jobTitle),
    companyName: asString(data.companyName),
    department: asString(data.department),
    employeeType: asString(data.employeeType),
  };
}
