import type { Tag } from "../lib/types";

interface Props {
  tags: Tag[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function TagFilterBar({ tags, selected, onChange }: Props) {
  function toggle(id: number) {
    if (selected.includes(id)) {
      onChange(selected.filter((v) => v !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
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
            {tag.item_count !== undefined && <span className="ml-1 opacity-70">({tag.item_count})</span>}
          </button>
        );
      })}
      {selected.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-full px-3 py-1 text-xs text-slate-400 underline hover:text-slate-600"
        >
          タグ選択をクリア
        </button>
      )}
    </div>
  );
}
