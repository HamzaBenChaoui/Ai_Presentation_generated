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
      refresh = raw ? JSON.parse(raw) : null;
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: user !== null,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
