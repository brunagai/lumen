import { z } from "zod";

import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export const AUTH_METHODS = ["email", "google", "wallet"] as const;
export type AuthMethod = (typeof AUTH_METHODS)[number];

export const USER_ROLES = ["donor", "institution"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const sessionSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  method: z.enum(AUTH_METHODS),
  role: z.enum(USER_ROLES),
});

export type Session = z.infer<typeof sessionSchema>;

export type SignInInput = {
  method: AuthMethod;
  role: UserRole;
};

export type AuthPort = {
  getSession(): Promise<Result<Session | null>>;
  requireSession(): Promise<Result<Session>>;
  verifySession(session: Session): Promise<Result<Session>>;
  signIn(input: SignInInput): Promise<Result<Session>>;
  signOut(): Promise<Result<void>>;
};

export function canAccessInstitutionPortal(
  session: Session | null,
): session is Session & { role: "institution" } {
  return session?.role === "institution";
}

export function requireInstitutionRole(
  session: Session,
): Result<Session & { role: "institution" }> {
  if (!canAccessInstitutionPortal(session)) {
    return err(
      new AppError(
        "AUTH_FORBIDDEN",
        "Apenas a instituição autenticada pode executar esta operação.",
      ),
    );
  }

  return ok(session);
}
