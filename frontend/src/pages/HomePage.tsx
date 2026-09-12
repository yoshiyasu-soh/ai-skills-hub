import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ItemCard from "../components/ItemCard";
import TagFilterBar from "../components/TagFilterBar";
import { BoxIcon, ChevronRightIcon, SearchIcon, SparkleIcon } from "../components/icons";
import { api } from "../lib/api";
import type { Item, SortOption, Tag } from "../lib/types";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "updated", label: "更新順" },
  { value: "popular", label: "利用数順(DL/コピー)" },
  { value: "favorites", label: "お気に入り数順" },
  { value: "name", label: "名前順" },
];

const PAGE_SIZE = 20;

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const mine = searchParams.get("mine") === "1";

  const [type, setType] = useState<"all" | "skill" | "prompt">("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [page, setPage] = useState(1);

  function toggleMine() {
    const next = new URLSearchParams(searchParams);
    if (mine) {
      next.delete("mine");
    } else {
      next.set("mine", "1");
    }
    setSearchParams(next);
  }

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
  }, [type, debouncedQ, selectedTagIds, sort, mine]);

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
        authorEmail: mine ? "me" : undefined,
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
  }, [type, debouncedQ, selectedTagIds, sort, page, mine]);

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">みんなのAIスキル・プロンプトを見つけよう</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            実務で使えるAIスキルやプロンプトを共有・発見できます。あなたの知識・ノウハウも、ぜひシェアしてください。
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:w-96">
          <Link
            to="/guide/skills"
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition hover:border-skill/40 hover:shadow-card-hover"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-skill/10 text-skill">
              <BoxIcon className="h-4 w-4" />
            </div>
            <p className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              SKILLとは？
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-skill" />
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Claudeに特定の作業をさせるための再利用可能な機能。</p>
          </Link>
          <Link
            to="/guide/prompts"
            className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-card transition hover:border-prompt/40 hover:shadow-card-hover"
          >
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-prompt/10 text-prompt">
              <SparkleIcon className="h-4 w-4" />
            </div>
            <p className="flex items-center gap-1 text-sm font-semibold text-slate-800">
              PROMPTとは？
              <ChevronRightIcon className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-prompt" />
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-400">Claudeにそのままコピーして使える指示文。</p>
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex overflow-hidden rounded-lg border border-slate-200">
            {(["all", "skill", "prompt"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  type === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "all" ? "すべて" : v === "skill" ? "スキル" : "プロンプト"}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleMine}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
              mine
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            自分の投稿のみ
          </button>

          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル・説明文を検索"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <TagFilterBar tags={tags} selected={selectedTagIds} onChange={setSelectedTagIds} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-400">読み込み中...</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-400">
          {mine ? "まだ投稿がありません。" : "該当する投稿が見つかりませんでした。"}
        </p>
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
