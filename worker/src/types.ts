export interface Env {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ENVIRONMENT: string;
  // .dev.vars でのみ設定するローカル開発用バイパス(本番では未設定)
  DEV_BYPASS_EMAIL?: string;
  // Microsoft Graph でユーザープロフィール(氏名・役職等)を取得するための設定。
  // 未設定でもアプリ本体は動作する(プロフィール同期が無効になるだけ)。
  ENTRA_TENANT_ID?: string;
  ENTRA_CLIENT_ID?: string;
  // 機密情報のため wrangler.jsonc の vars には書かず、`wrangler secret put` で設定する
  ENTRA_CLIENT_SECRET?: string;
  // "true" にすると Entra ID の userType が "Member" 以外(Guest等)のユーザーを拒否する。
  // Microsoft Graph 連携(ENTRA_TENANT_ID等)が未設定の場合、全員が拒否される点に注意。
  RESTRICT_TO_MEMBERS?: string;
}

export interface AuthUser {
  email: string;
  displayName: string;
}

export type ItemType = "skill" | "prompt";
export type SortOption = "newest" | "updated" | "popular" | "favorites" | "name";
export type RankingPeriod = "all" | "7d" | "30d";

export interface ItemRow {
  id: string;
  type: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  body: string;
  r2_key: string | null;
  file_name: string | null;
  file_size: number | null;
  version: string;
  author_email: string;
  usage_count: number;
  favorite_count: number;
  created_at: string;
  updated_at: string;
}

export interface TagRow {
  id: number;
  name: string;
  label: string;
  is_default: number;
  item_count?: number;
}

export interface UserProfileRow {
  email: string;
  display_name: string;
  given_name: string | null;
  surname: string | null;
  job_title: string | null;
  company_name: string | null;
  department: string | null;
  employee_type: string | null;
  user_type: string | null;
  profile_synced_at: string | null;
}
