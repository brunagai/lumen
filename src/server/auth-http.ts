import "server-only";

import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import {
  toAuthApiFailure,
  toAuthApiSuccess,
  type AuthApiEnvelope,
} from "@/lib/auth-api";
import {
  isTrustedMutationOrigin,
  readMutationOriginHeaders,
} from "@/lib/request-origin";
import type { Result } from "@/lib/result";

export function jsonAuthResult<T>(
  result: Result<T>,
  successStatus = 200,
): NextResponse<AuthApiEnvelope<T>> {
  if (!result.ok) {
    const status =
      result.error.code === "AUTH_UNAUTHENTICATED"
        ? 401
        : result.error.code === "AUTH_FORBIDDEN"
          ? 403
          : result.error.code === "INVALID_INPUT"
            ? 400
            : 500;

    return NextResponse.json(toAuthApiFailure(result.error), { status });
  }

  return NextResponse.json(toAuthApiSuccess(result.value), {
    status: successStatus,
  });
}

export function rejectUntrustedOrigin(request: Request): NextResponse | null {
  const trusted = isTrustedMutationOrigin({
    method: request.method,
    ...readMutationOriginHeaders(request),
  });

  if (trusted) {
    return null;
  }

  return NextResponse.json(
    toAuthApiFailure(
      new AppError(
        "AUTH_FORBIDDEN",
        "Origem da requisição não autorizada.",
      ),
    ),
    { status: 403 },
  );
}
