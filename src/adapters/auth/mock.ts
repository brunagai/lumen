import {
  sessionSchema,
  type AuthPort,
  type Session,
  type SignInInput,
} from "@/adapters/auth/types";
import { INSTITUTION } from "@/config/campaign";
import { delay } from "@/lib/delay";
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

  async requireSession() {
    const result = await this.getSession();

    if (!result.ok) {
      return result;
    }

    if (!result.value) {
      return err(
        new AppError(
          "AUTH_UNAUTHENTICATED",
          "Entre para continuar.",
        ),
      );
    }

    return ok(result.value);
  },

  async verifySession(presented) {
    const parsed = sessionSchema.safeParse(presented);

    if (!parsed.success) {
      return err(new AppError("AUTH_UNAUTHENTICATED", "Sessão inválida."));
    }

    const current = await this.requireSession();

    if (!current.ok) {
      return current;
    }

    if (
      current.value.userId !== parsed.data.userId ||
      current.value.role !== parsed.data.role ||
      current.value.method !== parsed.data.method
    ) {
      return err(
        new AppError(
          "AUTH_FORBIDDEN",
          "A sessão informada não corresponde ao usuário autenticado.",
        ),
      );
    }

    return ok(current.value);
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
