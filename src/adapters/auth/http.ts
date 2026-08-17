import {
  type AuthPort,
  type Session,
  type SignInInput,
} from "@/adapters/auth/types";
import {
  parseAuthApiEnvelope,
  parseNullValue,
  parseOptionalSessionValue,
  parseSessionValue,
} from "@/lib/auth-api";
import { delay } from "@/lib/delay";
import { AppError } from "@/lib/errors";
import { AUTH_NETWORK_LATENCY_MS } from "@/lib/simulated-network";
import { err, ok, type Result } from "@/lib/result";

async function requestAuthApi<T>(
  path: string,
  init: RequestInit,
  parseValue: (value: unknown) => T,
): Promise<Result<T>> {
  try {
    const response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const payload: unknown = await response.json();

    return parseAuthApiEnvelope(payload, parseValue);
  } catch (cause) {
    return err(
      new AppError(
        "NETWORK",
        "Não foi possível falar com o servidor de autenticação.",
        cause,
      ),
    );
  }
}

export const httpAuthAdapter: AuthPort = {
  async getSession() {
    return requestAuthApi(
      "/api/auth/session",
      { method: "GET" },
      parseOptionalSessionValue,
    );
  },

  async requireSession() {
    const result = await this.getSession();

    if (!result.ok) {
      return result;
    }

    if (!result.value) {
      return err(new AppError("AUTH_UNAUTHENTICATED", "Entre para continuar."));
    }

    return ok(result.value);
  },

  async verifySession(session: Session) {
    await delay(AUTH_NETWORK_LATENCY_MS);

    return requestAuthApi(
      "/api/auth/verify",
      {
        method: "POST",
        body: JSON.stringify(session),
      },
      parseSessionValue,
    );
  },

  async signIn(input: SignInInput) {
    await delay(AUTH_NETWORK_LATENCY_MS);

    return requestAuthApi(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      parseSessionValue,
    );
  },

  async signOut() {
    await delay(AUTH_NETWORK_LATENCY_MS);

    const result = await requestAuthApi(
      "/api/auth/logout",
      { method: "POST" },
      parseNullValue,
    );

    if (!result.ok) {
      return result;
    }

    return ok(undefined);
  },
};
