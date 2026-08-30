// Authentication context for the Slide AI frontend.
//
// Holds the current user and access token, persisted in localStorage so a
// refresh keeps the session. On mount it validates any stored token against
// the backend's /auth/me endpoint.
//
// The backend is the source of truth for identity; this context is only a
// client-side cache refreshed from /auth/me.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  authApi,
  clearTokens,
  getAccessToken,
  storeTokens,
  type User,
} from "../lib/api";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (fullName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate any stored token on first load.
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me(token)
      .then((u) => setUser(u))
      .catch(() => clearTokens())
      .finally(() => setLoading(false));
  }, []);

  // 30-day sessions: silently rotate the Supabase refresh token whenever the
  // access token is close to expiry. Sessions only end on Sign Out.
  useEffect(() => {
    const REFRESH_MARGIN_MS = 10 * 60 * 1000;
    const tick = async () => {
      let refreshToken: string | null = null;
      try {
        refreshToken = localStorage.getItem("slideai.refresh_token");
      } catch {
        refreshToken = null;
      }
      if (!refreshToken) return;
      const expiresAt = Number(localStorage.getItem("slideai.token_expires_at") || 0);
      if (expiresAt && Date.now() < expiresAt - REFRESH_MARGIN_MS) return;
      try {
        const res = await authApi.refresh(refreshToken);
        if (res.access_token && res.refresh_token) {
          storeTokens({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            token_type: "bearer",
            expires_in: res.expires_in ?? null,
          });
        }
      } catch {
        /* keep the current session; the next 401 forces a new login */
      }
    };
    tick();
    const id = window.setInterval(tick, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const signIn = async (email: string, password: string) => {
    const res = await authApi.signIn(email, password);
    storeTokens(res.tokens);
    setUser(res.user);
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    const res = await authApi.signUp(email, password, fullName);
    storeTokens(res.tokens);
    setUser(res.user);
  };

  const signOut = async () => {
    let refresh: string | null = null;
    try {
      const raw = localStorage.getItem("slideai.refresh_token");
      refresh = raw;
    } catch {
      refresh = null;
    }
    try {
      await authApi.signOut(refresh);
    } finally {
      clearTokens();
      setUser(null);
    }
  };

  const updateDisplayName = async (fullName: string) => {
    const updated = await authApi.updateDisplayName(fullName.trim());
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        signIn,
        signUp,
        signOut,
        updateDisplayName,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
