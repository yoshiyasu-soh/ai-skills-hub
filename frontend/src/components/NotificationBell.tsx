import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { VersionNotification } from "../lib/types";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<VersionNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function refresh() {
    api.notifications
      .list()
      .then((res) => setNotifications(res.notifications))
      .catch(() => {
        // 通知の取得失敗はベルの表示を諦めるだけで、他の操作をブロックしない
      });
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleToggle() {
    const next = !open;
    setOpen(next);
    if (next) refresh();
  }

  async function handleReadAll() {
    setLoading(true);
    try {
      await api.notifications.readAll();
      setNotifications([]);
    } catch {
      // 失敗時はリストをそのまま残す
    } finally {
      setLoading(false);
    }
  }

  function handleItemClick(itemId: string) {
    setOpen(false);
    setNotifications((prev) => prev.filter((n) => n.itemId !== itemId));
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label="更新通知"
        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
      >
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
          <path
            d="M6 8a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10 18a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {notifications.length > 9 ? "9+" : notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">更新通知</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={() => void handleReadAll()}
                disabled={loading}
                className="text-xs text-indigo-600 hover:underline disabled:opacity-50"
              >
                すべて既読にする
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-slate-400">
                お気に入り・DL・コピー済みの項目に更新はありません
              </p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.itemId}
                  to={`/items/${n.itemId}`}
                  onClick={() => handleItemClick(n.itemId)}
                  className="block border-b border-slate-50 px-3 py-2 last:border-0 hover:bg-slate-50"
                >
                  <p className="line-clamp-1 text-sm font-medium text-slate-800">{n.title}</p>
                  <p className="text-xs text-slate-400">
                    v{n.previousVersion} → v{n.currentVersion}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
