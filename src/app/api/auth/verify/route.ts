import { NextResponse } from "next/server";

import { toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonAuthResult, rejectUntrustedOrigin } from "@/server/auth-http";
import { verifyPresentedSession } from "@/server/auth-service";

export async function POST(request: Request) {
  const untrusted = rejectUntrustedOrigin(request);

  if (untrusted) {
    return untrusted;
  }

  try {
    const body: unknown = await request.json();

    return jsonAuthResult(await verifyPresentedSession(body));
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
