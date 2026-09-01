import { useState } from "react";
import { api } from "../lib/api";
import type { Tag } from "../lib/types";

interface Props {
  tags: Tag[];
  selected: number[];
  onChange: (ids: number[]) => void;
  onTagCreated: (tag: Tag) => void;
}

export default function TagPicker({ tags, selected, onChange, onTagCreated }: Props) {
  const [newTagName, setNewTagName] = useState("");
  const [creating, setCreating] = useState(false);
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

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selected.includes(tag.id);
          return (
            <button
              key={tag.id}
              type="button"
              onClick={() => toggle(tag.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                active
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400"
              }`}
            >
              #{tag.label}
            </button>
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
    </div>
  );
}
