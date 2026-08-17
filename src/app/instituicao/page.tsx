import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InstitutionGate } from "@/app/instituicao/institution-gate";
import { canAccessInstitutionPortal } from "@/adapters/auth/types";
import { tryGetSessionSecret } from "@/lib/session-secret";
import {
  SESSION_COOKIE_NAME,
  sessionFromCookieValue,
} from "@/lib/session-token";

export default async function InstituicaoPage() {
  const cookieStore = await cookies();
  const session = await sessionFromCookieValue(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
    tryGetSessionSecret(),
  );

  if (!canAccessInstitutionPortal(session)) {
    const motivo = session ? "papel-insuficiente" : "nao-autenticado";
    redirect(`/?acesso=instituicao&motivo=${motivo}`);
  }

  return <InstitutionGate />;
}
