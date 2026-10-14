"use client";

import { ReactNode, createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "@/lib/api/auth";

type AuthState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "logged-in"; user: authApi.AuthUser };

interface AuthContextValue {
  state: AuthState;
  signup: (input: { name: string; username: string; phone: string; password: string }) => Promise<authApi.AuthUser>;
  login: (input: { username: string; password: string }) => Promise<authApi.AuthUser>;
  logout: () => Promise<void>;
  // Re-reads /auth/me and updates state — for flows where a session
  // cookie gets set as a side effect of some other request (e.g. the
  // budget-leads form silently signing up a new visitor) rather than
  // through signup()/login() themselves.
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    authApi.getCurrentUser().then((user) => {
      if (cancelled) return;
      setState(user ? { status: "logged-in", user } : { status: "logged-out" });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signup = useCallback(async (input: { name: string; username: string; phone: string; password: string }) => {
    const user = await authApi.signup(input);
    setState({ status: "logged-in", user });
    return user;
  }, []);

  const login = useCallback(async (input: { username: string; password: string }) => {
    const user = await authApi.login(input);
    setState({ status: "logged-in", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ status: "logged-out" });
  }, []);

  const refresh = useCallback(async () => {
    const user = await authApi.getCurrentUser();
    setState(user ? { status: "logged-in", user } : { status: "logged-out" });
  }, []);

  return <AuthContext.Provider value={{ state, signup, login, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
