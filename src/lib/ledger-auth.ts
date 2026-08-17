import { requireInstitutionRole, type Session } from "@/adapters/auth/types";
import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export function authorizeLedgerAccess(
  session: Session | null,
  options: { institutionOnly: boolean },
): Result<Session> {
  if (!session) {
    return err(
      new AppError("AUTH_UNAUTHENTICATED", "Entre para continuar."),
    );
  }

  if (options.institutionOnly) {
    return requireInstitutionRole(session);
  }

  return ok(session);
}
