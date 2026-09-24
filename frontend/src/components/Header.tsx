import { NavLink } from "react-router-dom";
import { useUser } from "../lib/UserContext";
import LogoMark from "./LogoMark";
import NotificationBell from "./NotificationBell";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export default function Header() {
  const { user } = useUser();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:px-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <NavLink to="/" className="flex items-center gap-2 text-[15px] font-bold tracking-tight text-slate-900">
            <LogoMark className="h-7 w-7 shrink-0" />
            <span className="hidden sm:inline">AI Skills Hub</span>
          </NavLink>
          <nav className="flex items-center gap-0.5">
            <NavLink to="/" end className={navLinkClass}>
              一覧
            </NavLink>
            <NavLink to="/ranking" className={navLinkClass}>
              ランキング
            </NavLink>
            <NavLink to="/favorites" className={navLinkClass}>
              お気に入り
            </NavLink>
            <NavLink to="/guide/mcp" className={navLinkClass}>
              MCP連携
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NavLink
            to="/post"
            className="rounded-md bg-brand-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
          >
            + 投稿する
          </NavLink>
          {user && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3 text-sm text-slate-600">
              <NotificationBell />
              <NavLink
                to={`/users/${encodeURIComponent(user.email)}`}
                className="hidden items-center gap-2 rounded-md px-2 py-1.5 hover:bg-slate-100 sm:flex"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
                  {user.displayName.slice(0, 1)}
                </span>
                <span className="font-medium text-slate-700">{user.displayName}</span>
              </NavLink>
              <a
                href="/cdn-cgi/access/logout"
                className="rounded-md px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-700"
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
