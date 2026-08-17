import { NextResponse, type NextRequest } from "next/server";

import { canAccessInstitutionPortal } from "@/adapters/auth/types";
import { buildContentSecurityPolicy } from "@/lib/csp";
import { tryGetSessionSecret } from "@/lib/session-secret";
import {
  SESSION_COOKIE_NAME,
  sessionFromCookieValue,
} from "@/lib/session-token";

function applyCsp(response: NextResponse, nonce: string, csp: string) {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("x-nonce", nonce);
  return response;
}

/**
 * Next.js 16 Proxy (former middleware.ts):
 * - issues a per-request CSP nonce (no 'unsafe-inline')
 * - blocks /instituicao unless the signed session cookie has role === "institution"
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildContentSecurityPolicy(nonce);
  const pathname = request.nextUrl.pathname;
  const isInstitutionRoute =
    pathname === "/instituicao" || pathname.startsWith("/instituicao/");

  if (isInstitutionRoute) {
    const session = await sessionFromCookieValue(
      request.cookies.get(SESSION_COOKIE_NAME)?.value,
      tryGetSessionSecret(),
    );

    if (!canAccessInstitutionPortal(session)) {
      const redirectUrl = new URL("/", request.url);
      redirectUrl.searchParams.set("acesso", "instituicao");
      redirectUrl.searchParams.set(
        "motivo",
        session ? "papel-insuficiente" : "nao-autenticado",
      );

      return applyCsp(NextResponse.redirect(redirectUrl), nonce, csp);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  return applyCsp(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    nonce,
    csp,
  );
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
