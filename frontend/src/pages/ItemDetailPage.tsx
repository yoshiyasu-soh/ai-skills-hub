import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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

  async function handleDownloadClick() {
    if (!item) return;
    // 実ダウンロードは <a href> のブラウザ標準遷移に任せる(カウントはサーバ側で加算される)。
    // 表示上のカウントだけ楽観的に更新する。
    setItem((prev) => (prev ? { ...prev, usageCount: prev.usageCount + 1 } : prev));
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
            isSkill ? "bg-skill" : "bg-prompt"
          }`}
        >
          {isSkill ? "スキル" : "プロンプト"}
        </span>
        {item.isOwner && (
          <div className="flex gap-2">
            <Link
              to={`/items/${item.id}/edit`}
              className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
            >
              編集
            </Link>
            <button
              type="button"
              onClick={() => void handleDelete()}
              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              削除
            </button>
          </div>
        )}
      </div>

      <h1 className="mb-2 text-2xl font-bold text-slate-900">{item.title}</h1>
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
        <span>投稿者: {item.authorName}</span>
        <span>バージョン: {item.version}</span>
        <span>更新: {new Date(item.updatedAt).toLocaleString("ja-JP")}</span>
      </div>

      {item.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span key={tag.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              #{tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleToggleFavorite()}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
        >
          <span className={item.isFavorited ? "text-amber-400" : "text-slate-300"}>★</span>
          お気に入り ({item.favoriteCount})
        </button>

        {isSkill ? (
          <a
            href={api.items.downloadUrl(item.id)}
            onClick={() => void handleDownloadClick()}
            className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            ダウンロード ({item.usageCount}件)
          </a>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              クリップボードにコピー ({item.usageCount}件)
            </button>
            <button
              type="button"
              onClick={() => void handleOpenInClaude()}
              className="rounded-md border border-indigo-300 px-4 py-1.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              claude.aiで新規チャットを開く
            </button>
          </>
        )}
      </div>

      {item.summary && (
        <div className="mb-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">{item.summary}</div>
      )}

      {item.description && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-500">説明</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.description}</p>
        </section>
      )}

      {isSkill && item.fileName && (
        <section className="mb-6 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
          ファイル: {item.fileName} ({formatBytes(item.fileSize)})
        </section>
      )}

      {isSkill && item.body && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-500">使い方メモ</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{item.body}</p>
        </section>
      )}

      {!isSkill && (
        <section className="mb-6">
          <h2 className="mb-1 text-sm font-semibold text-slate-500">プロンプト本文</h2>
          <pre className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800">
            {item.body}
          </pre>
        </section>
      )}
    </div>
  );
}
