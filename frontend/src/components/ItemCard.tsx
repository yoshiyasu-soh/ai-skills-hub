import { Link } from "react-router-dom";
import type { Item } from "../lib/types";

interface Props {
  item: Item;
  onToggleFavorite?: (item: Item) => void;
  rank?: number;
}

export default function ItemCard({ item, onToggleFavorite, rank }: Props) {
  const isSkill = item.type === "skill";

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rank !== undefined && (
            <span className="text-sm font-bold text-slate-400">#{rank}</span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${
              isSkill ? "bg-skill" : "bg-prompt"
            }`}
          >
            {isSkill ? "スキル" : "プロンプト"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onToggleFavorite?.(item)}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-amber-500"
          aria-label="お気に入り切り替え"
        >
          <span className={item.isFavorited ? "text-amber-400" : "text-slate-300"}>★</span>
          <span>{item.favoriteCount}</span>
        </button>
      </div>

      <Link to={`/items/${item.id}`} className="mb-1 line-clamp-2 text-base font-semibold text-slate-900 hover:underline">
        {item.title}
      </Link>
      <p className="mb-3 line-clamp-2 flex-1 text-sm text-slate-600">{item.summary || "説明はまだありません"}</p>

      {item.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={tag.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              #{tag.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{item.authorName}</span>
        <span>
          {item.periodCount !== undefined
            ? `${item.periodCount}件 (期間内)`
            : `${isSkill ? "DL" : "コピー"} ${item.usageCount}件`}
        </span>
      </div>
    </div>
  );
}
