import "server-only";

import {
  sessionSchema,
  type Session,
  type SignInInput,
} from "@/adapters/auth/types";
import { INSTITUTION } from "@/config/campaign";
import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";
import {
  clearSessionCookie,
  createSessionCookie,
  readSessionCookie,
} from "@/server/session-cookie";

export function buildSession(input: SignInInput): Session {
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

export async function loginWithMockIdentity(
  input: SignInInput,
): Promise<Result<Session>> {
  const session = buildSession(input);

  await createSessionCookie(session);

  return ok(session);
}

export async function logoutCurrentSession(): Promise<Result<null>> {
  await clearSessionCookie();

  return ok(null);
}

export async function getCurrentSession(): Promise<Result<Session | null>> {
  return ok(await readSessionCookie());
}

export async function verifyPresentedSession(
  presented: unknown,
): Promise<Result<Session>> {
  const parsed = sessionSchema.safeParse(presented);

  if (!parsed.success) {
    return err(new AppError("AUTH_UNAUTHENTICATED", "Sessão inválida."));
  }

  const current = await readSessionCookie();

  if (!current) {
    return err(
      new AppError("AUTH_UNAUTHENTICATED", "Entre para continuar."),
    );
  }

  if (
    current.userId !== parsed.data.userId ||
    current.role !== parsed.data.role ||
    current.method !== parsed.data.method
  ) {
    return err(
      new AppError(
        "AUTH_FORBIDDEN",
        "A sessão informada não corresponde ao usuário autenticado.",
      ),
    );
  }

  return ok(current);
}
