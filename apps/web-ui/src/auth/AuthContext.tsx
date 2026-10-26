import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, PublicUser } from "@vmi/contracts";
import { api, ApiError, tokenStore } from "../lib/api";

interface AuthValue {
  user: PublicUser | null;
  loading: boolean;
  completeSignIn: (r: AuthResponse) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(() => tokenStore.get() !== null);

  // On startup, if a token exists, ask the API who we are
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api<{ user: PublicUser }>("/auth/me")
      .then((r) => !cancelled && setUser(r.user))
      .catch((e) => {
        // Only drop the token when the server says it's invalid, not when the API is merely down
        if (e instanceof ApiError && e.status === 401) tokenStore.clear();
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const completeSignIn = (r: AuthResponse) => {
    tokenStore.set(r.token);
    setUser(r.user);
  };

  const signOut = async () => {
    try {
      await api("/auth/signout", { method: "POST" });
    } catch {
      /* ignore: we clear locally anyway */
    }
    tokenStore.clear();
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, completeSignIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
