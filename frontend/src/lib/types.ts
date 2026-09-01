export type ItemType = "skill" | "prompt";
export type SortOption = "newest" | "popular" | "favorites" | "name";
export type RankingPeriod = "all" | "7d" | "30d";

export interface Tag {
  id: number;
  name: string;
  label: string;
  is_default: number;
  item_count?: number;
}

export interface ItemTagRef {
  id: number;
  name: string;
  label: string;
}

export interface Item {
  id: string;
  type: ItemType;
  slug: string;
  title: string;
  summary: string;
  description: string;
  body: string;
  fileName: string | null;
  fileSize: number | null;
  version: string;
  authorEmail: string;
  authorName: string;
  usageCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  tags: ItemTagRef[];
  isFavorited: boolean;
  isOwner: boolean;
  periodCount?: number;
}

export interface User {
  email: string;
  displayName: string;
}
