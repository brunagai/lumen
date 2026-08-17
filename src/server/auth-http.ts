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

export function jsonApiResult<T>(
  result: Result<T>,
  successStatus = 200,
): NextResponse<AuthApiEnvelope<T>> {
  if (!result.ok) {
    const status = statusForError(result.error.code);
    return NextResponse.json(toAuthApiFailure(result.error), { status });
  }

  return NextResponse.json(toAuthApiSuccess(result.value), {
    status: successStatus,
  });
}

export const jsonAuthResult = jsonApiResult;

function statusForError(code: AppError["code"]): number {
  switch (code) {
    case "AUTH_UNAUTHENTICATED":
      return 401;
    case "AUTH_FORBIDDEN":
      return 403;
    case "INVALID_INPUT":
    case "INVALID_AMOUNT":
      return 400;
    case "NOT_FOUND":
      return 404;
    case "INSUFFICIENT_FUNDS":
      return 409;
    case "TX_FAILED":
    case "NETWORK":
      return 502;
    case "MOCK_FAILURE":
      return 503;
    default:
      return 500;
  }
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
