import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import TagPicker from "../components/TagPicker";
import { api } from "../lib/api";
import type { ItemType, Tag } from "../lib/types";

export default function PostItemPage() {
  const navigate = useNavigate();

  const [type, setType] = useState<ItemType>("skill");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.tags
      .list()
      .then((res) => setTags(res.tags))
      .catch(() => {
        /* タグ取得に失敗しても投稿自体は継続できる */
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("タイトルを入力してください");
      return;
    }
    if (type === "prompt" && !body.trim()) {
      setError("プロンプト本文を入力してください");
      return;
    }
    if (type === "skill" && !file) {
      setError("スキル資産のZIPファイルを選択してください");
      return;
    }

    setSubmitting(true);
    try {
      let created;
      if (type === "skill") {
        const fd = new FormData();
        fd.set("type", type);
        fd.set("title", title);
        fd.set("summary", summary);
        fd.set("description", description);
        fd.set("version", version);
        fd.set("body", body);
        fd.set("tagIds", JSON.stringify(selectedTagIds));
        if (file) fd.set("file", file);
        created = await api.items.create(fd);
      } else {
        created = await api.items.create({
          type,
          title,
          summary,
          description,
          version,
          body,
          tagIds: JSON.stringify(selectedTagIds),
        });
      }
      navigate(`/items/${created.item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-xl font-bold text-slate-900">新規投稿</h1>

      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">種別</label>
          <div className="flex overflow-hidden rounded-lg border border-slate-300 w-fit">
            {(["skill", "prompt"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setType(v)}
                className={`px-4 py-1.5 text-sm font-medium ${
                  type === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {v === "skill" ? "スキル(ZIP配布)" : "プロンプト(コピー用)"}
              </button>
            ))}
          </div>
        </div>

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
          <label className="mb-1 block text-sm font-medium text-slate-700">概要(一覧カードに表示)</label>
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

        {type === "skill" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">スキル資産(ZIP) *</label>
              <input
                type="file"
                accept=".zip"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
              <p className="mt-1 text-xs text-slate-400">最大25MBまで。npx skills add 互換の配布は将来対応予定です。</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">使い方メモ(任意)</label>
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
            {submitting ? "投稿中..." : "投稿する"}
          </button>
        </div>
      </form>
    </div>
  );
}
