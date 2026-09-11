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
      <dd className="text-sm text-slate-800">{value || <span className="text-slate-300">未設定</span>}</dd>
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

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">{profile.displayName}</h1>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-50"
        >
          {syncing ? "同期中..." : "Entra IDと今すぐ同期"}
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-5">
        <Field label="メールアドレス" value={profile.email} />
        <Field label="表示名" value={profile.displayName} />
        <Field label="姓" value={profile.surname} />
        <Field label="名" value={profile.givenName} />
        <Field label="役職" value={profile.jobTitle} />
        <Field label="会社名" value={profile.companyName} />
        <Field label="部署" value={profile.department} />
        <Field label="従業員の種類" value={profile.employeeType} />
        <Field
          label="アカウント種別"
          value={profile.userType === "Member" ? "メンバー" : profile.userType === "Guest" ? "ゲスト" : profile.userType}
        />
      </dl>

      <p className="mt-2 text-xs text-slate-400">
        {profile.profileSyncedAt
          ? `Entra IDとの最終同期: ${new Date(`${profile.profileSyncedAt.replace(" ", "T")}Z`).toLocaleString("ja-JP")}`
          : "Entra IDとまだ同期されていません(Graph連携が未設定か、反映待ちの可能性があります)"}
        {isSelf && "。表示名・役職等はEntra ID側の情報が変わると自動的に更新されます。"}
      </p>
    </div>
  );
}
