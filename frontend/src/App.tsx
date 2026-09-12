import { Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import LogoMark from "./components/LogoMark";
import EditItemPage from "./pages/EditItemPage";
import FavoritesPage from "./pages/FavoritesPage";
import GuidePage from "./pages/GuidePage";
import HomePage from "./pages/HomePage";
import ItemDetailPage from "./pages/ItemDetailPage";
import PostItemPage from "./pages/PostItemPage";
import RankingPage from "./pages/RankingPage";
import UserProfilePage from "./pages/UserProfilePage";
import { useUser } from "./lib/UserContext";

export default function App() {
  const { loading, error } = useUser();

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3">
        <LogoMark className="h-9 w-9 animate-pulse" />
        <p className="text-sm text-slate-400">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    const isGuestForbidden = error.includes("guest accounts are not allowed");
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <LogoMark className="mb-2 h-9 w-9 opacity-60" />
        <p className="text-lg font-semibold text-slate-900">
          {isGuestForbidden ? "このアプリはご利用いただけません" : "認証情報の取得に失敗しました"}
        </p>
        {isGuestForbidden ? (
          <p className="max-w-sm text-sm text-slate-500">
            このアプリはメンバー(社員)アカウント専用です。ゲストアカウントでのご利用はできません。
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">{error}</p>
            <p className="text-xs text-slate-400">Cloudflare Access 経由でアクセスしているかご確認ください。</p>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      <main className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-10">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />
          <Route path="/items/:id/edit" element={<EditItemPage />} />
          <Route path="/post" element={<PostItemPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/users/:email" element={<UserProfilePage />} />
          <Route path="/guide/skills" element={<GuidePage topic="skill" />} />
          <Route path="/guide/prompts" element={<GuidePage topic="prompt" />} />
        </Routes>
      </main>
    </div>
  );
}
