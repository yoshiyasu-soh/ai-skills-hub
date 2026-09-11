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
  // Entra ID の userType ("Member" | "Guest")。RESTRICT_TO_MEMBERS で使用する。
  userType: string | null;
}

const SELECT_FIELDS = "displayName,givenName,surname,jobTitle,companyName,department,employeeType,userType";

function asString(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

function mapGraphUser(data: Record<string, unknown>): GraphProfile {
  return {
    displayName: asString(data.displayName),
    givenName: asString(data.givenName),
    surname: asString(data.surname),
    jobTitle: asString(data.jobTitle),
    companyName: asString(data.companyName),
    department: asString(data.department),
    employeeType: asString(data.employeeType),
    userType: asString(data.userType),
  };
}

/**
 * Microsoft Graph (アプリ専用権限 User.Read.All) からユーザープロフィールを取得する。
 * 未設定・権限未同意・対象ユーザーが見つからない等の場合は null を返し、呼び出し元で
 * 既存のフォールバック表示(メールのユーザー名部分等)を継続できるようにする。
 */
export async function fetchGraphProfile(env: Env, email: string): Promise<GraphProfile | null> {
  const token = await getGraphToken(env);
  if (!token) return null;

  // 社内メンバーは email === userPrincipalName であることが多いため、まず直接ルックアップを試す(高速)。
  const directUrl = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}?$select=${SELECT_FIELDS}`;
  const directRes = await fetch(directUrl, { headers: { Authorization: `Bearer ${token}` } });

  if (directRes.ok) {
    return mapGraphUser((await directRes.json()) as Record<string, unknown>);
  }
  if (directRes.status !== 404) {
    console.error("Graph user lookup failed:", directRes.status, await directRes.text().catch(() => ""));
    return null;
  }

  // 個人のMicrosoftアカウント等で招待された「ゲストユーザー」は userPrincipalName が
  // "xxx_hotmail.com#EXT#@tenant.onmicrosoft.com" のような形式になり email と一致しないため、
  // mail / otherMails 属性でのフィルタ検索にフォールバックする。
  // otherMails は複数値プロパティへの any() を使うため ConsistencyLevel: eventual が必要。
  const filterValue = email.replace(/'/g, "''");
  const filter = `mail eq '${filterValue}' or otherMails/any(m:m eq '${filterValue}')`;
  const searchUrl = `https://graph.microsoft.com/v1.0/users?$filter=${encodeURIComponent(filter)}&$select=${SELECT_FIELDS}&$top=1&$count=true`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}`, ConsistencyLevel: "eventual" },
  });
  if (!searchRes.ok) {
    console.error("Graph user search failed:", searchRes.status, await searchRes.text().catch(() => ""));
    return null;
  }

  const searchData = (await searchRes.json()) as { value?: Record<string, unknown>[] };
  const user = searchData.value?.[0];
  return user ? mapGraphUser(user) : null;
}
