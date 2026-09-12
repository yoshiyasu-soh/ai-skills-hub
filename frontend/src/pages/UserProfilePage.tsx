import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { useToast } from "../lib/ToastContext";
import { useUser } from "../lib/UserContext";
import type { User } from "../lib/types";

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || <span className="text-slate-300">未設定</span>}</dd>
    </div>
  );
}

export default function UserProfilePage() {
  const { email } = useParams<{ email: string }>();
  const { user: currentUser } = useUser();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    setError(null);
    api.users
      .get(email)
      .then((res) => setProfile(res.user))
      .catch((err) => setError(err instanceof Error ? err.message : "取得に失敗しました"))
      .finally(() => setLoading(false));
  }, [email]);

  async function handleSync() {
    if (!email) return;
    setSyncing(true);
    try {
      const res = await api.users.sync(email);
      setProfile(res.user);
      showToast(res.synced ? "Entra IDと同期しました" : "同期できませんでした(Graph連携が未設定の可能性があります)");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "同期に失敗しました");
    } finally {
      setSyncing(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">読み込み中...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;
  if (!profile) return null;

  const isSelf = currentUser?.email === profile.email;
  const isMember = profile.userType === "Member";

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
            {profile.displayName.slice(0, 1)}
          </span>
          <div>
            <h1 className="text-xl font-bold leading-tight text-slate-900">{profile.displayName}</h1>
            <p className="text-sm text-slate-400">{profile.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
        >
          {syncing ? "同期中..." : "Entra IDと今すぐ同期"}
        </button>
      </div>

      {profile.userType && (
        <span
          className={`mb-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            isMember ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {isMember ? "メンバー" : profile.userType === "Guest" ? "ゲスト" : profile.userType}
        </span>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-card">
        <Field label="姓" value={profile.surname} />
        <Field label="名" value={profile.givenName} />
        <Field label="役職" value={profile.jobTitle} />
        <Field label="会社名" value={profile.companyName} />
        <Field label="部署" value={profile.department} />
        <Field label="従業員の種類" value={profile.employeeType} />
      </dl>

      <p className="mt-3 text-xs text-slate-400">
        {profile.profileSyncedAt
          ? `Entra IDとの最終同期: ${new Date(`${profile.profileSyncedAt.replace(" ", "T")}Z`).toLocaleString("ja-JP")}`
          : "Entra IDとまだ同期されていません(Graph連携が未設定か、反映待ちの可能性があります)"}
        {isSelf && "。表示名・役職等はEntra ID側の情報が変わると自動的に更新されます。"}
      </p>
    </div>
  );
}
