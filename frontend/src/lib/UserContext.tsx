import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "./api";
import type { User } from "./types";

interface UserContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextValue>({ user: null, loading: true, error: null });

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((res) => {
        if (!cancelled) setUser(res.user);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "認証情報の取得に失敗しました");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <UserContext.Provider value={{ user, loading, error }}>{children}</UserContext.Provider>;
}

export function useUser() {
  return useContext(UserContext);
}
