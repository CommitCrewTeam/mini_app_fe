import { createContext, useContext, useState, useEffect, useRef } from "react";
import { accountApi, refreshAccessToken, clearSession, getAccessToken } from "../api/client";
import type { ReactNode } from "react";

type AuthUser = { id: string; username: string; name: string; roles: string[]; permissions: string[]; role: "admin" | "supervisor" | "user" };
type AuthResult = { success: true } | { success: false; message: string };
type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<AuthResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to complete authentication.";
}

function userFromAccessToken(token: string): AuthUser {
  const payload = token.split(".")[1];
  const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
  const claims = JSON.parse(new TextDecoder().decode(bytes));
  const roles = Array.isArray(claims.roles) ? claims.roles : [];
  // Claims are for display only; the API verifies the JWT and enforces permissions.
  return {
    id: claims.sub,
    username: claims.username,
    name: claims.username,
    roles,
    permissions: Array.isArray(claims.permissions) ? claims.permissions : [],
    role: roles.includes("ADMIN") ? "admin" : roles.includes("SUPERVISOR") ? "supervisor" : "user",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionAction = useRef(0);

  useEffect(() => {
    let active = true;
    const action = sessionAction.current;

    function handleSessionExpired() {
      sessionAction.current += 1;
      setUser(null);
    }

    async function restoreSession() {
      try {
        const token = await refreshAccessToken();
        if (active && action === sessionAction.current) setUser(userFromAccessToken(token));
      } catch {
        if (active && action === sessionAction.current) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    function handleTokenChanged() {
      const token = getAccessToken();
      if (token && active) setUser(userFromAccessToken(token));
    }
    window.addEventListener("access-token-changed", handleTokenChanged);
    window.addEventListener("session-expired", handleSessionExpired);
    restoreSession();
    return function cleanup() {
      active = false;
      window.removeEventListener("session-expired", handleSessionExpired);
      window.removeEventListener("access-token-changed", handleTokenChanged);
    };
  }, []);

  async function login(username: string, password: string): Promise<AuthResult> {
    const action = ++sessionAction.current;
    try {
      const result = await accountApi.login(username.trim(), password);
      if (action !== sessionAction.current) return { success: false, message: "Session changed. Please try again." };
      setUser(userFromAccessToken(result.accessToken));
      return { success: true };
    } catch (error) {
      if (action === sessionAction.current) clearSession();
      return { success: false, message: errorMessage(error) };
    }
  }

  async function logout(): Promise<AuthResult> {
    try {
      await accountApi.logout();
      setUser(null);
      return { success: true };
    } catch (error) {
      return { success: false, message: errorMessage(error) };
    }
  }

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
