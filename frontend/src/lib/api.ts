import type { Item, RankingPeriod, SortOption, Tag, User } from "./types";

const API_BASE = "/api";

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string; message?: string };
      if (data?.error) message = data.message ? `${data.error}: ${data.message}` : data.error;
    } catch {
      // レスポンスがJSONでない場合はデフォルトメッセージを使う
    }
    throw new ApiError(res.status, message);
  }

  return (await res.json()) as T;
}

function buildQuery(params: Record<string, unknown>): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length > 0) usp.set(key, value.join(","));
    } else {
      usp.set(key, String(value));
    }
  }
  return usp.toString();
}

export interface ListItemsParams {
  type?: "skill" | "prompt";
  q?: string;
  tags?: number[];
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface ListItemsResult {
  items: Item[];
  total: number;
  page: number;
  pageSize: number;
}

export const api = {
  me: () => request<{ user: User }>("/me"),

  tags: {
    list: () => request<{ tags: Tag[] }>("/tags"),
    create: (name: string) =>
      request<{ tag: Tag }>("/tags", { method: "POST", body: JSON.stringify({ name }) }),
  },

  items: {
    list: (params: ListItemsParams) =>
      request<ListItemsResult>(`/items?${buildQuery(params as Record<string, unknown>)}`),
    get: (id: string) => request<{ item: Item }>(`/items/${id}`),
    create: (payload: FormData | Record<string, unknown>) =>
      request<{ item: Item }>("/items", {
        method: "POST",
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      }),
    update: (id: string, payload: FormData | Record<string, unknown>) =>
      request<{ item: Item }>(`/items/${id}`, {
        method: "PUT",
        body: payload instanceof FormData ? payload : JSON.stringify(payload),
      }),
    remove: (id: string) => request<{ ok: true }>(`/items/${id}`, { method: "DELETE" }),
    downloadUrl: (id: string) => `${API_BASE}/items/${id}/download`,
    copy: (id: string) => request<{ usageCount: number }>(`/items/${id}/copy`, { method: "POST" }),
    favorite: (id: string) =>
      request<{ favorited: boolean; favoriteCount: number }>(`/items/${id}/favorite`, { method: "POST" }),
    unfavorite: (id: string) =>
      request<{ favorited: boolean; favoriteCount: number }>(`/items/${id}/favorite`, { method: "DELETE" }),
  },

  favorites: {
    list: () => request<{ items: Item[] }>("/favorites"),
  },

  ranking: {
    list: (params: { type?: "skill" | "prompt"; period?: RankingPeriod; limit?: number }) =>
      request<{ items: Item[]; period: string; type: string }>(
        `/ranking?${buildQuery(params as Record<string, unknown>)}`,
      ),
  },
};

export { ApiError };
