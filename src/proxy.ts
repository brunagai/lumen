import { NextResponse, type NextRequest } from "next/server";

import { canAccessInstitutionPortal } from "@/adapters/auth/types";
import { tryGetSessionSecret } from "@/lib/session-secret";
import {
  SESSION_COOKIE_NAME,
  sessionFromCookieValue,
} from "@/lib/session-token";

/**
 * Next.js 16 renamed Middleware to Proxy. This file is the request interceptor
 * that used to live in middleware.ts: it blocks /instituicao before render
 * unless the signed httpOnly session cookie has role === "institution".
 */
export async function proxy(request: NextRequest) {
  const session = await sessionFromCookieValue(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
    tryGetSessionSecret(),
  );

  if (canAccessInstitutionPortal(session)) {
    return NextResponse.next();
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("acesso", "instituicao");
  redirectUrl.searchParams.set(
    "motivo",
    session ? "papel-insuficiente" : "nao-autenticado",
  );

  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/instituicao", "/instituicao/:path*"],
};
