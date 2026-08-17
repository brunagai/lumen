import {
  sessionSchema,
  type AuthPort,
  type Session,
  type SignInInput,
} from "@/adapters/auth/types";
import { INSTITUTION } from "@/config/campaign";
import { delay } from "@/lib/delay";
import { shouldForceMockFailure } from "@/lib/env";
import { AppError, toAppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

const STORAGE_KEY = "lumen.auth.session";
const MOCK_LATENCY_MS = 400;

function readStoredSession(): Session | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = sessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(session: Session | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

async function withSimulatedNetwork<T>(operation: () => T): Promise<Result<T>> {
  try {
    await delay(MOCK_LATENCY_MS);

    if (shouldForceMockFailure()) {
      return err(
        new AppError("MOCK_FAILURE", "Falha simulada na autenticação."),
      );
    }

    return ok(operation());
  } catch (cause) {
    return err(toAppError(cause));
  }
}

function buildSession(input: SignInInput): Session {
  if (input.role === "institution") {
    return {
      userId: `inst_${INSTITUTION.id}`,
      displayName: INSTITUTION.name,
      method: input.method,
      role: "institution",
    };
  }

  return {
    userId: "donor_mock",
    displayName: "Doadora",
    method: input.method,
    role: "donor",
  };
}

export const mockAuthAdapter: AuthPort = {
  async getSession() {
    try {
      return ok(readStoredSession());
    } catch (cause) {
      return err(toAppError(cause));
    }
  },

  async signIn(input) {
    return withSimulatedNetwork(() => {
      const session = buildSession(input);
      writeStoredSession(session);
      return session;
    });
  },

  async signOut() {
    return withSimulatedNetwork(() => {
      writeStoredSession(null);
    });
  },
};
