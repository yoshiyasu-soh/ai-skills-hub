import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ItemCard from "../components/ItemCard";
import TagFilterBar from "../components/TagFilterBar";
import { BoxIcon, ChevronRightIcon, CloseIcon, SearchIcon, SparkleIcon } from "../components/icons";
import { api } from "../lib/api";
import type { Item, SortOption, Tag } from "../lib/types";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "newest", label: "新着順" },
  { value: "updated", label: "更新順" },
  { value: "popular", label: "利用数順(DL/コピー)" },
  { value: "favorites", label: "お気に入り数順" },
  { value: "name", label: "名前順" },
];

const TYPE_OPTIONS = ["all", "skill", "prompt"] as const;
type TypeFilter = (typeof TYPE_OPTIONS)[number];

const PAGE_SIZE = 20;
const GUIDE_CARDS_DISMISSED_KEY = "aish:home:guideCardsDismissed";

export default function HomePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const mine = searchParams.get("mine") === "1";
  const typeParam = searchParams.get("type");
  const type: TypeFilter = TYPE_OPTIONS.includes(typeParam as TypeFilter) ? (typeParam as TypeFilter) : "all";
  const sortParam = searchParams.get("sort");
  const sort: SortOption = SORT_OPTIONS.some((o) => o.value === sortParam) ? (sortParam as SortOption) : "newest";
  const tagsParam = searchParams.get("tags") ?? "";
  const selectedTagIds = useMemo(
    () =>
      tagsParam
        .split(",")
        .filter(Boolean)
        .map(Number)
        .filter((n) => !Number.isNaN(n)),
    [tagsParam],
  );

  // フィルタ状態はすべてURLの検索パラメータに保持する(戻る/リロード/共有でフィルタが失われないように)。
  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  }

  const [q, setQ] = useState(() => searchParams.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get("q") ?? "");
  const [tags, setTags] = useState<Tag[]>([]);
  const [page, setPage] = useState(1);

  const [guideCardsDismissed, setGuideCardsDismissed] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_CARDS_DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  function dismissGuideCards() {
    setGuideCardsDismissed(true);
    try {
      localStorage.setItem(GUIDE_CARDS_DISMISSED_KEY, "1");
    } catch {
      // localStorageが使えない環境では次回も表示されるだけなので無視
    }
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
    updateParams({ q: debouncedQ || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ]);

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
  }, [type, debouncedQ, tagsParam, sort, mine]);

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
  const hasActiveFilters = type !== "all" || debouncedQ !== "" || selectedTagIds.length > 0;

  function clearFilters() {
    setQ("");
    updateParams({ type: null, q: null, tags: null });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">みんなのAIスキル・プロンプトを見つけよう</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            実務で使えるAIスキルやプロンプトを共有・発見できます。あなたの知識・ノウハウも、ぜひシェアしてください。
          </p>
        </div>
        {!guideCardsDismissed && (
          <div className="relative grid shrink-0 grid-cols-1 gap-3 sm:w-96 sm:grid-cols-2">
            <button
              type="button"
              onClick={dismissGuideCards}
              aria-label="このガイドを閉じる"
              title="閉じる"
              className="absolute -right-2 -top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-card hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
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
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Claudeに特定の作業をさせるための再利用可能な機能。</p>
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
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Claudeにそのままコピーして使える指示文。</p>
            </Link>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-100/70 p-1">
            <div className="flex items-center overflow-hidden rounded-md">
              {TYPE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => updateParams({ type: v === "all" ? null : v })}
                  aria-pressed={type === v}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
                    type === v ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {v === "all" ? "すべて" : v === "skill" ? "スキル" : "プロンプト"}
                </button>
              ))}
            </div>
            <span className="h-5 w-px bg-slate-200" aria-hidden="true" />
            <button
              type="button"
              onClick={() => updateParams({ mine: mine ? null : "1" })}
              aria-pressed={mine}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
                mine ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              自分の投稿のみ
            </button>
          </div>

          <div className="relative min-w-[220px] flex-1">
            <label htmlFor="home-search" className="sr-only">
              タイトル・説明文を検索
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="home-search"
              name="q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="タイトル・説明文を検索"
              className="w-full rounded-lg border border-slate-200 py-1.5 pl-9 pr-3 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div>
            <label htmlFor="home-sort" className="sr-only">
              並び替え
            </label>
            <select
              id="home-sort"
              name="sort"
              value={sort}
              onChange={(e) => updateParams({ sort: e.target.value === "newest" ? null : e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TagFilterBar
          tags={tags}
          selected={selectedTagIds}
          onChange={(ids) => updateParams({ tags: ids.length ? ids.join(",") : null })}
        />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-slate-500">読み込み中...</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white py-10 text-center text-sm text-slate-500">
          <p>
            {mine
              ? "まだ投稿がありません。"
              : hasActiveFilters
                ? "この条件に一致する投稿が見つかりませんでした。"
                : "まだ投稿がありません。"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 font-medium text-brand-600 underline hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
            >
              フィルタをクリア
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
