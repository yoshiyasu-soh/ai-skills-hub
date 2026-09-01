import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import TagFilterBar from "../components/TagFilterBar";
import { api } from "../lib/api";
import type { Item, SortOption, Tag } from "../lib/types";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "popular", label: "利用数順(DL/コピー)" },
  { value: "favorites", label: "お気に入り数順" },
  { value: "name", label: "名前順" },
];

const PAGE_SIZE = 20;

export default function HomePage() {
  const [type, setType] = useState<"all" | "skill" | "prompt">("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    api.tags
      .list()
      .then((res) => setTags(res.tags))
      .catch(() => {
        /* タグ取得失敗時はフィルタなしで続行 */
      });
  }, []);

  useEffect(() => {
    setPage(1);
  }, [type, debouncedQ, selectedTagIds, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.items
      .list({
        type: type === "all" ? undefined : type,
        q: debouncedQ || undefined,
        tags: selectedTagIds,
        sort,
        page,
        pageSize: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "一覧の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [type, debouncedQ, selectedTagIds, sort, page]);

  async function handleToggleFavorite(item: Item) {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, isFavorited: !i.isFavorited, favoriteCount: i.favoriteCount + (i.isFavorited ? -1 : 1) }
          : i,
      ),
    );
    try {
      if (item.isFavorited) {
        await api.items.unfavorite(item.id);
      } else {
        await api.items.favorite(item.id);
      }
    } catch {
      // 失敗時は再取得で状態を戻す
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id
            ? { ...i, isFavorited: item.isFavorited, favoriteCount: item.favoriteCount }
            : i,
        ),
      );
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          {(["all", "skill", "prompt"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={`px-3 py-1.5 text-sm font-medium ${
                type === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v === "all" ? "すべて" : v === "skill" ? "スキル" : "プロンプト"}
            </button>
          ))}
        </div>

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="タイトル・説明文を検索"
          className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <TagFilterBar tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">該当する投稿が見つかりませんでした。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            前へ
          </button>
          <span className="text-slate-500">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-slate-300 px-3 py-1 disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
