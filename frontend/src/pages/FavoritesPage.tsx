import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import { api } from "../lib/api";
import type { Item } from "../lib/types";

export default function FavoritesPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.favorites
      .list()
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "取得に失敗しました"))
      .finally(() => setLoading(false));
  }, []);

  async function handleToggleFavorite(item: Item) {
    try {
      await api.items.unfavorite(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch {
      // 失敗時は何もしない(一覧に残す)
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">お気に入り</h1>
      {loading ? (
        <p className="text-sm text-slate-400">読み込み中...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">お気に入りに登録した投稿はまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  );
}
