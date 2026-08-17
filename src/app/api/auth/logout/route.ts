import { NextResponse } from "next/server";

import { toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonAuthResult, rejectUntrustedOrigin } from "@/server/auth-http";
import { logoutCurrentSession } from "@/server/auth-service";

export async function POST(request: Request) {
  const untrusted = rejectUntrustedOrigin(request);

  if (untrusted) {
    return untrusted;
  }

  try {
    return jsonAuthResult(await logoutCurrentSession());
  } catch (cause) {
    return jsonAuthResult(err(toAppError(cause)));
  }
}

export function GET() {
  return NextResponse.json(
    { ok: false, error: { code: "INVALID_INPUT", message: "Use POST." } },
    { status: 405 },
  );
}
