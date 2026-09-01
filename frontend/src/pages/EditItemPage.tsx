import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import TagPicker from "../components/TagPicker";
import { api } from "../lib/api";
import type { Item, Tag } from "../lib/types";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([api.items.get(id), api.tags.list()])
      .then(([itemRes, tagsRes]) => {
        const it = itemRes.item;
        if (!it.isOwner) {
          setLoadError("この投稿を編集する権限がありません");
          return;
        }
        setItem(it);
        setTitle(it.title);
        setSummary(it.summary);
        setDescription(it.description);
        setVersion(it.version);
        setBody(it.body);
        setSelectedTagIds(it.tags.map((t) => t.id));
        setTags(tagsRes.tags);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!item) return;
    setError(null);

    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (item.type === "prompt" && !body.trim()) {
      setError("プロンプト本文を入力してください");
      return;
    }

    setSubmitting(true);
    try {
      let updated;
      if (item.type === "skill") {
        const fd = new FormData();
        fd.set("title", title);
        fd.set("summary", summary);
        fd.set("description", description);
        fd.set("version", version);
        fd.set("body", body);
        fd.set("tagIds", JSON.stringify(selectedTagIds));
        if (file) fd.set("file", file);
        updated = await api.items.update(item.id, fd);
      } else {
        updated = await api.items.update(item.id, {
          title,
          summary,
          description,
          version,
          body,
          tagIds: JSON.stringify(selectedTagIds),
        });
      }
      navigate(`/items/${updated.item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">読み込み中...</p>;
  if (loadError) return <p className="text-sm text-red-500">{loadError}</p>;
  if (!item) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">編集: {item.title}</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">タイトル *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">概要</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            maxLength={200}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">詳細説明</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">バージョン</label>
          <input
            type="text"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>

        {item.type === "skill" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                スキル資産(ZIP) — 差し替える場合のみ選択
              </label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              {item.fileName && <p className="mt-1 text-xs text-slate-400">現在のファイル: {item.fileName}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">使い方メモ</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">プロンプト本文 *</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">タグ</label>
          <TagPicker
            tags={tags}
            selected={selectedTagIds}
            onChange={setSelectedTagIds}
            onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存する"}
          </button>
        </div>
      </form>
    </div>
  );
}
