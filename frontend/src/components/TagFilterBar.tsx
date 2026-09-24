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
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-slate-500">タグで絞り込み(すべて一致):</span>
      {tags.map((tag) => {
        const active = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400 ${
              active
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-brand-300 hover:bg-white"
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
          className="rounded-full px-3 py-1 text-xs text-slate-500 underline hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400"
        >
          タグ選択をクリア
        </button>
      )}
    </div>
  );
}
