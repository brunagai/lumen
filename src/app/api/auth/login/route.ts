import { NextResponse } from "next/server";

import { signInInputSchema } from "@/adapters/auth/types";
import { AppError, toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonAuthResult, rejectUntrustedOrigin } from "@/server/auth-http";
import { loginWithMockIdentity } from "@/server/auth-service";

export async function POST(request: Request) {
  const untrusted = rejectUntrustedOrigin(request);

  if (untrusted) {
    return untrusted;
  }

  try {
    const body: unknown = await request.json();
    const parsed = signInInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonAuthResult(
        err(new AppError("INVALID_INPUT", "Dados de login inválidos.")),
      );
    }

    return jsonAuthResult(await loginWithMockIdentity(parsed.data));
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
