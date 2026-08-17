import { z } from "zod";

import { sessionSchema, type Session } from "@/adapters/auth/types";

export const SESSION_COOKIE_NAME = "lumen_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const TOKEN_VERSION = "v1";

const sessionPayloadSchema = sessionSchema.extend({
  exp: z.number().int().positive(),
});

type SessionPayload = z.infer<typeof sessionPayloadSchema>;

function encodeUtf8(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;

  try {
    const binary = atob(`${padded}${"=".repeat(padLength)}`);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index]! ^ right[index]!;
  }

  return diff === 0;
}

async function hmacSha256(secret: string, value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    encodeUtf8(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encodeUtf8(value));

  return new Uint8Array(signature);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function signSessionToken(
  session: Session,
  secret: string,
  nowMs = Date.now(),
): Promise<string> {
  const payload: SessionPayload = {
    ...session,
    exp: Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS,
  };
  const encodedPayload = bytesToBase64Url(encodeUtf8(JSON.stringify(payload)));
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const mac = bytesToBase64Url(await hmacSha256(secret, signingInput));

  return `${signingInput}.${mac}`;
}

export async function readSessionToken(
  token: string,
  secret: string,
  nowMs = Date.now(),
): Promise<Session | null> {
  const parts = token.split(".");

  if (parts.length !== 3 || parts[0] !== TOKEN_VERSION) {
    return null;
  }

  const [, encodedPayload, encodedMac] = parts;
  const signingInput = `${TOKEN_VERSION}.${encodedPayload}`;
  const expectedMac = await hmacSha256(secret, signingInput);
  const presentedMac = base64UrlToBytes(encodedMac ?? "");

  if (!presentedMac || !timingSafeEqual(expectedMac, presentedMac)) {
    return null;
  }

  const payloadBytes = base64UrlToBytes(encodedPayload ?? "");

  if (!payloadBytes) {
    return null;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payloadBytes)) as unknown;
    const payload = sessionPayloadSchema.safeParse(parsed);

    if (!payload.success || payload.data.exp <= Math.floor(nowMs / 1000)) {
      return null;
    }

    const { exp: _expiresAt, ...session } = payload.data;
    void _expiresAt;

    return session;
  } catch {
    return null;
  }
}

export async function sessionFromCookieValue(
  token: string | undefined,
  secret: string | null,
  nowMs = Date.now(),
): Promise<Session | null> {
  if (!token || !secret) {
    return null;
  }

  return readSessionToken(token, secret, nowMs);
}
