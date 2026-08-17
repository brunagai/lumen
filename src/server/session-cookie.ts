import "server-only";

import { cookies } from "next/headers";

import type { Session } from "@/adapters/auth/types";
import { getSessionSecret, tryGetSessionSecret } from "@/lib/session-secret";
import {
  SESSION_COOKIE_NAME,
  readSessionToken,
  sessionCookieOptions,
  signSessionToken,
} from "@/lib/session-token";

export async function createSessionCookie(session: Session): Promise<void> {
  const token = await signSessionToken(session, getSessionSecret());
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions());
}

export async function readSessionCookie(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const secret = tryGetSessionSecret();

  if (!token || !secret) {
    return null;
  }

  return readSessionToken(token, secret);
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...sessionCookieOptions(),
    maxAge: 0,
  });
}
