import { NavLink } from "react-router-dom";
import { useUser } from "../lib/UserContext";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200"
  }`;

export default function Header() {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <NavLink to="/" className="text-lg font-bold text-slate-900">
            AI Skills Hub
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navLinkClass}>
              一覧
            </NavLink>
            <NavLink to="/ranking" className={navLinkClass}>
              ランキング
            </NavLink>
            <NavLink to="/favorites" className={navLinkClass}>
              お気に入り
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink
            to="/post"
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            + 投稿する
          </NavLink>
          {user && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="hidden sm:inline">{user.displayName}</span>
              <a
                href="/cdn-cgi/access/logout"
                className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
              >
                ログアウト
              </a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
