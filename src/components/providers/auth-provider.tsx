"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { authAdapter } from "@/adapters/auth";
import type { Session, SignInInput } from "@/adapters/auth/types";
import type { AppError } from "@/lib/errors";
import type { Result } from "@/lib/result";

type AuthStatus = "loading" | "ready";

type AuthContextValue = {
  session: Session | null;
  status: AuthStatus;
  error: AppError | null;
  signIn: (input: SignInInput) => Promise<Result<Session>>;
  signOut: () => Promise<Result<void>>;
  signInAsInstitution: () => Promise<Result<Session>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<AppError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSession() {
      const result = await authAdapter.getSession();

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setSession(result.value);
        setError(null);
      } else {
        setSession(null);
        setError(result.error);
      }

      setStatus("ready");
    }

    void hydrateSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (input: SignInInput) => {
    const result = await authAdapter.signIn(input);

    if (result.ok) {
      setSession(result.value);
      setError(null);
    } else {
      setError(result.error);
    }

    return result;
  }, []);

  const signOut = useCallback(async () => {
    const result = await authAdapter.signOut();

    if (result.ok) {
      setSession(null);
      setError(null);
    } else {
      setError(result.error);
    }

    return result;
  }, []);

  const signInAsInstitution = useCallback(() => {
    return signIn({ method: "email", role: "institution" });
  }, [signIn]);

  const value = useMemo(
    () => ({
      session,
      status,
      error,
      signIn,
      signOut,
      signInAsInstitution,
    }),
    [session, status, error, signIn, signOut, signInAsInstitution],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  }

  return context;
}
