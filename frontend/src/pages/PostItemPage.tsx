import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import MarkdownEditor from "../components/MarkdownEditor";
import TagPicker from "../components/TagPicker";
import { BoxIcon, CheckIcon, InfoIcon, SparkleIcon, TagIcon } from "../components/icons";
import { api } from "../lib/api";
import { parseSkillMd } from "../lib/parseSkillMd";
import type { ItemType, Tag } from "../lib/types";

const inputClass =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

const TIPS = [
  "概要は100字以内で簡潔に(一覧カードにそのまま表示されます)",
  "詳細説明には、何ができるか・どんな場面で使うかを具体的に書くと伝わりやすくなります",
  "スキルはSKILL.md単体でも投稿できます(タイトル・概要が自動入力されます)",
  "適切なタグを選ぶと、他の人が見つけやすくなります",
];

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
  const [autoFilled, setAutoFilled] = useState(false);

  useEffect(() => {
    api.tags
      .list()
      .then((res) => setTags(res.tags))
      .catch(() => {
        /* タグ取得に失敗しても投稿自体は継続できる */
      });
  }, []);

  async function handleFileChange(f: File | null) {
    setFile(f);
    setAutoFilled(false);

    if (!f || !f.name.toLowerCase().endsWith(".md")) return;

    try {
      const text = await f.text();
      const parsed = parseSkillMd(text);
      let filled = false;

      // 既に手入力された内容は上書きしない(空欄のみ自動入力)
      if (parsed.title && !title.trim()) {
        setTitle(parsed.title);
        filled = true;
      }
      if (parsed.summary && !summary.trim()) {
        setSummary(parsed.summary);
        filled = true;
      }
      if (parsed.description && !description.trim()) {
        setDescription(parsed.description);
        filled = true;
      }
      if (parsed.body && !body.trim()) {
        setBody(parsed.body);
        filled = true;
      }
      setAutoFilled(filled);
    } catch {
      // 読み取り・解析に失敗しても手動入力にフォールバックするだけなので無視する
    }
  }

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
      setError("スキル資産のファイル(.zip または SKILL.md)を選択してください");
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

  const accentText = type === "skill" ? "text-skill" : "text-prompt";
  const accentBg = type === "skill" ? "bg-skill" : "bg-prompt";

  return (
    <div className="mx-auto max-w-[1280px]">
      <div className="mb-6 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${accentBg}`}>
          {type === "skill" ? <BoxIcon className="h-4.5 w-4.5" /> : <SparkleIcon className="h-4 w-4" />}
        </div>
        <div>
          <p className={`text-xs font-semibold uppercase tracking-wide ${accentText}`}>新規投稿</p>
          <h1 className="text-xl font-bold text-slate-900">あなたの知識・ノウハウを共有しましょう</h1>
        </div>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
            <div>
              <label className={labelClass}>種別</label>
              <div className="flex overflow-hidden rounded-lg border border-slate-200 w-fit">
                {(["skill", "prompt"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setType(v)}
                    className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                      type === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {v === "skill" ? "スキル(再利用可能な機能)" : "プロンプト(コピー用)"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelClass}>タイトル *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
                placeholder="例: PRレビューチェックリスト"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>概要(一覧カードに表示)</label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                maxLength={200}
                placeholder="どんな時に使えるか、一言で"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                詳細説明 <span className="font-normal text-slate-400">(Markdown対応)</span>
              </label>
              <MarkdownEditor
                value={description}
                onChange={setDescription}
                rows={5}
                textareaClassName={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>バージョン</label>
              <input
                type="text"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                className={`w-40 font-mono ${inputClass}`}
              />
            </div>

            {type === "skill" ? (
              <>
                <div>
                  <label className={labelClass}>スキル資産(.zip または SKILL.md) *</label>
                  <input
                    type="file"
                    accept=".zip,.md"
                    onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
                    className="w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-1.5 text-xs text-slate-400">
                    最大25MBまで。ZIP一式でもSKILL.md単体でも投稿できます。npx skills add 互換の配布は将来対応予定です。
                  </p>
                  {autoFilled && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <CheckIcon className="h-3.5 w-3.5" />
                      SKILL.mdの内容からタイトル・概要等を自動入力しました(空欄だった項目のみ)。
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>使い方メモ(任意)</label>
                  <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className={inputClass} />
                </div>
              </>
            ) : (
              <div>
                <label className={labelClass}>プロンプト本文 *</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={8}
                  required
                  className={`font-mono ${inputClass}`}
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
              >
                {submitting ? "投稿中..." : "投稿する"}
              </button>
            </div>
          </div>

          <aside className="flex flex-col gap-4 lg:sticky lg:top-20">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <InfoIcon className="h-3.5 w-3.5" />
                入力のヒント
              </p>
              <ul className="flex flex-col gap-2.5">
                {TIPS.map((tip) => (
                  <li key={tip} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <TagIcon className="h-3.5 w-3.5" />
                タグ
              </p>
              <TagPicker
                tags={tags}
                selected={selectedTagIds}
                onChange={setSelectedTagIds}
                onTagCreated={(tag) => setTags((prev) => [...prev, tag])}
                onTagDeleted={(tagId) => setTags((prev) => prev.filter((t) => t.id !== tagId))}
              />
            </div>
          </aside>
        </div>
      </form>
    </div>
  );
}
