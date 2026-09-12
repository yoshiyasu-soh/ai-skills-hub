import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon, BoxIcon, CopyIcon, DownloadIcon, ExternalLinkIcon, FileIcon, SparkleIcon, StarIcon } from "../components/icons";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import type { Item } from "../lib/types";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.items
      .get(id)
      .then((res) => setItem(res.item))
      .catch((err) => setError(err instanceof Error ? err.message : "取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleToggleFavorite() {
    if (!item) return;
    const next = !item.isFavorited;
    setItem({ ...item, isFavorited: next, favoriteCount: item.favoriteCount + (next ? 1 : -1) });
    try {
      if (next) {
        await api.items.favorite(item.id);
      } else {
        await api.items.unfavorite(item.id);
      }
    } catch {
      showToast("お気に入りの更新に失敗しました");
    }
  }

  async function handleCopy() {
    if (!item) return;
    try {
      await navigator.clipboard.writeText(item.body);
      showToast("プロンプトをクリップボードにコピーしました");
    } catch {
      showToast("クリップボードへのコピーに失敗しました");
      return;
    }
    try {
      const res = await api.items.copy(item.id);
      setItem((prev) => (prev ? { ...prev, usageCount: res.usageCount } : prev));
    } catch {
      // カウント更新の失敗はユーザー操作をブロックしない
    }
  }

  async function handleOpenInClaude() {
    if (!item) return;
    const url = `https://claude.ai/new?q=${encodeURIComponent(item.body)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    try {
      const res = await api.items.copy(item.id);
      setItem((prev) => (prev ? { ...prev, usageCount: res.usageCount } : prev));
    } catch {
      // カウント更新の失敗はユーザー操作をブロックしない
    }
  }

  function handleDownloadClick() {
    if (!item) return;
    // 実ダウンロードは <a href> のブラウザ標準遷移に任せているため、JS側はこの時点で
    // サーバーが実際にカウントしたか(投稿者本人・2回目以降のダウンロードは加算されない)を知る手段が無い。
    // ダウンロードリクエストがサーバーで完了する程度の時間を置いてから、実際の値を取得し直す。
    const targetId = item.id;
    setTimeout(() => {
      api.items
        .get(targetId)
        .then((res) => {
          setItem((prev) => (prev && prev.id === targetId ? { ...prev, usageCount: res.item.usageCount } : prev));
        })
        .catch(() => {
          // 再取得に失敗しても表示中の値をそのまま維持する
        });
    }, 1000);
  }

  async function handleDelete() {
    if (!item) return;
    if (!window.confirm(`「${item.title}」を削除します。よろしいですか？`)) return;
    try {
      await api.items.remove(item.id);
      showToast("削除しました");
      navigate("/");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "削除に失敗しました");
    }
  }

  if (loading) return <p className="text-sm text-slate-400">読み込み中...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!item) return <p className="text-sm text-slate-400">見つかりませんでした。</p>;

  const isSkill = item.type === "skill";
  const accentText = isSkill ? "text-skill" : "text-prompt";
  const accentBg = isSkill ? "bg-skill" : "bg-prompt";

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeftIcon className="h-4 w-4" />
        一覧に戻る
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white ${accentBg}`}>
              {isSkill ? <BoxIcon className="h-5 w-5" /> : <SparkleIcon className="h-5 w-5" />}
            </div>
            <div>
              <span className="flex items-center gap-1.5 text-xs">
                <span className={`font-semibold uppercase tracking-wide ${accentText}`}>
                  {isSkill ? "Skill" : "Prompt"}
                </span>
                <span className="font-mono text-slate-400">v{item.version}</span>
              </span>
              <h1 className="text-2xl font-bold leading-tight text-slate-900">{item.title}</h1>
            </div>
          </div>
          {item.isOwner && (
            <div className="flex shrink-0 gap-2">
              <Link
                to={`/items/${item.id}/edit`}
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                編集
              </Link>
              <button
                type="button"
                onClick={() => void handleDelete()}
                className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                削除
              </button>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
          <Link
            to={`/users/${encodeURIComponent(item.authorEmail)}`}
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600">
              {item.authorName.slice(0, 1)}
            </span>
            {item.authorName}
          </Link>
          <span>更新: {new Date(item.updatedAt).toLocaleString("ja-JP")}</span>
        </div>

        {item.hasUpdate && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
            前回ご覧になってからバージョンが更新されています(v{item.version})。
          </div>
        )}

        {item.tags.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                #{tag.label}
              </span>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2.5 border-t border-slate-100 pt-5">
          {isSkill ? (
            <a
              href={api.items.downloadUrl(item.id)}
              onClick={handleDownloadClick}
              className="inline-flex items-center gap-2 rounded-md bg-skill px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-skill/90"
            >
              <DownloadIcon className="h-4 w-4" />
              ダウンロード
              <span className="tabular-nums opacity-80">({item.usageCount} users)</span>
            </a>
          ) : (
            <>
              <button
                type="button"
                onClick={() => void handleCopy()}
                className="inline-flex items-center gap-2 rounded-md bg-prompt px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-prompt/90"
              >
                <CopyIcon className="h-4 w-4" />
                クリップボードにコピー
                <span className="tabular-nums opacity-80">({item.usageCount} users)</span>
              </button>
              <button
                type="button"
                onClick={() => void handleOpenInClaude()}
                className="inline-flex items-center gap-2 rounded-md border border-prompt/30 px-4 py-2 text-sm font-semibold text-prompt hover:bg-prompt/5"
              >
                <ExternalLinkIcon className="h-4 w-4" />
                claude.aiで新規チャットを開く
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => void handleToggleFavorite()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <StarIcon filled={item.isFavorited} className={`h-4 w-4 ${item.isFavorited ? "text-amber-400" : "text-slate-300"}`} />
            お気に入り
            <span className="tabular-nums">({item.favoriteCount})</span>
          </button>
        </div>
      </div>

      {item.summary && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-700 shadow-card">
          {item.summary}
        </div>
      )}

      {item.description && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">説明</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.description}</p>
        </section>
      )}

      {isSkill && item.fileName && (
        <section className="mt-6 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-card">
          <FileIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="font-mono">{item.fileName}</span>
          <span className="text-slate-400">({formatBytes(item.fileSize)})</span>
        </section>
      )}

      {isSkill && item.body && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">使い方メモ</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.body}</p>
        </section>
      )}

      {!isSkill && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">プロンプト本文</h2>
          <pre className="whitespace-pre-wrap rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-sm leading-relaxed text-slate-100 shadow-card">
            {item.body}
          </pre>
        </section>
      )}
    </div>
  );
}
