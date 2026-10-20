import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthState } from "../types/auth";

interface AuthContextValue {
  auth: AuthState | null;
  setAuth: (auth: AuthState | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuthState] = useState<AuthState | null>(() => {
    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");
    const role = localStorage.getItem("role") as AuthState["role"] | null;
    const isClientAdmin = localStorage.getItem("isClientAdmin") === "true";
    const permissionsJson = localStorage.getItem("permissions");
    const permissions = permissionsJson ? JSON.parse(permissionsJson) : undefined;
    const subscriptionStatus = (localStorage.getItem("subscriptionStatus") as AuthState["subscriptionStatus"]) || undefined;
    if (accessToken && refreshToken && role) {
      return { accessToken, refreshToken, role, isClientAdmin, permissions, subscriptionStatus };
    }
    return null;
  });

  const setAuth = (next: AuthState | null) => {
    setAuthState(next);
    if (next) {
      localStorage.setItem("accessToken", next.accessToken);
      localStorage.setItem("refreshToken", next.refreshToken);
      localStorage.setItem("role", next.role);
      localStorage.setItem("isClientAdmin", String(Boolean(next.isClientAdmin)));
      if (next.permissions) localStorage.setItem("permissions", JSON.stringify(next.permissions));
      if (next.subscriptionStatus) localStorage.setItem("subscriptionStatus", next.subscriptionStatus);
      else localStorage.removeItem("subscriptionStatus");
    } else {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("role");
      localStorage.removeItem("isClientAdmin");
      localStorage.removeItem("permissions");
      localStorage.removeItem("subscriptionStatus");
    }
  };

  const logout = () => setAuth(null);

  const value = useMemo(() => ({ auth, setAuth, logout }), [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
