import { useEffect, useState } from "react";
import ItemCard from "../components/ItemCard";
import { api } from "../lib/api";
import type { Item, RankingPeriod } from "../lib/types";

const PERIODS: { value: RankingPeriod; label: string }[] = [
  { value: "all", label: "累計" },
  { value: "30d", label: "過去30日" },
  { value: "7d", label: "過去7日" },
];

export default function RankingPage() {
  const [type, setType] = useState<"all" | "skill" | "prompt">("all");
  const [period, setPeriod] = useState<RankingPeriod>("all");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.ranking
      .list({ type: type === "all" ? undefined : type, period, limit: 20 })
      .then((res) => setItems(res.items))
      .catch((err) => setError(err instanceof Error ? err.message : "取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [type, period]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-slate-900">ランキング</h1>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          {(["all", "skill", "prompt"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={`px-3 py-1.5 text-sm font-medium ${
                type === v ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {v === "all" ? "すべて" : v === "skill" ? "スキル" : "プロンプト"}
            </button>
          ))}
        </div>
        <div className="flex overflow-hidden rounded-lg border border-slate-300">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 text-sm font-medium ${
                period === p.value ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">読み込み中...</p>
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">この期間の実績はまだありません。</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <ItemCard key={item.id} item={item} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
