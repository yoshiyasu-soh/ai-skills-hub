import { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import type { Tag } from "../lib/types";

interface Props {
  tags: Tag[];
  selected: number[];
  onChange: (ids: number[]) => void;
  onTagCreated: (tag: Tag) => void;
  onTagDeleted: (tagId: number) => void;
}

export default function TagPicker({ tags, selected, onChange, onTagCreated, onTagDeleted }: Props) {
  const { showToast } = useToast();
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  async function handleCreate() {
    const name = newTagName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.tags.create(name);
      onTagCreated(res.tag);
      onChange([...selected, res.tag.id]);
      setNewTagName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "タグの追加に失敗しました");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(tag: Tag) {
    if (!window.confirm(`タグ「${tag.label}」を削除しますか？(この操作は取り消せません)`)) return;
    setDeletingId(tag.id);
    try {
      await api.tags.remove(tag.id);
      onTagDeleted(tag.id);
      onChange(selected.filter((v) => v !== tag.id));
      showToast(`タグ「${tag.label}」を削除しました`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "タグの削除に失敗しました");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selected.includes(tag.id);
          const deletable = tag.isOwner && (tag.item_count ?? 0) === 0;
          return (
            <span
              key={tag.id}
              className={`inline-flex items-center overflow-hidden rounded-full border text-xs font-medium transition ${
                active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-600"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(tag.id)}
                className={`px-3 py-1 ${active ? "" : "hover:border-indigo-400"}`}
              >
                #{tag.label}
              </button>
              {deletable && (
                <button
                  type="button"
                  onClick={() => void handleDelete(tag)}
                  disabled={deletingId === tag.id}
                  aria-label={`タグ「${tag.label}」を削除`}
                  title="このタグを削除(未使用のタグのみ削除できます)"
                  className={`px-2 py-1 ${
                    active ? "text-indigo-100 hover:text-white" : "text-slate-400 hover:text-red-500"
                  } disabled:opacity-50`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleCreate();
            }
          }}
          placeholder="新しいタグを追加"
          maxLength={30}
          className="w-48 rounded-md border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !newTagName.trim()}
          className="rounded-md bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          追加
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <p className="mt-1 text-xs text-slate-400">
        自分が追加したタグで、まだどの投稿にも使われていないものだけ「×」で削除できます。
      </p>
    </div>
  );
}
