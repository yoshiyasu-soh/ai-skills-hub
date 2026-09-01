import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import EditItemPage from "./pages/EditItemPage";
import FavoritesPage from "./pages/FavoritesPage";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import PostItemPage from "./pages/PostItemPage";
import RankingPage from "./pages/RankingPage";
import { useUser } from "./lib/UserContext";

export default function App() {
  const { loading, error } = useUser();

  if (loading) {
    return <div className="flex h-screen items-center justify-center text-slate-400">読み込み中...</div>;
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2 text-center">
        <p className="text-lg font-semibold text-red-600">認証情報の取得に失敗しました</p>
        <p className="text-sm text-slate-500">{error}</p>
        <p className="text-xs text-slate-400">Cloudflare Access 経由でアクセスしているかご確認ください。</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/items/:id/edit" element={<EditItemPage />} />
          <Route path="/post" element={<PostItemPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/ranking" element={<RankingPage />} />
        </Routes>
      </main>
    </div>
  );
}
