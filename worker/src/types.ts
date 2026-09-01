export interface Env {
  DB: D1Database;
  ASSETS_BUCKET: R2Bucket;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
  ENVIRONMENT: string;
  // .dev.vars でのみ設定するローカル開発用バイパス(本番では未設定)
  DEV_BYPASS_EMAIL?: string;
}

export interface AuthUser {
  email: string;
  displayName: string;
}

export type ItemType = "skill" | "prompt";
export type SortOption = "newest" | "popular" | "favorites" | "name";
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
