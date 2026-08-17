import { sessionSchema, type Session } from "@/adapters/auth/types";
import { AppError, type ErrorCode, ERROR_CODES } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export type AuthApiSuccess<T> = {
  ok: true;
  value: T;
};

export type AuthApiFailure = {
  ok: false;
  error: {
    code: ErrorCode;
    message: string;
  };
};

export type AuthApiEnvelope<T> = AuthApiSuccess<T> | AuthApiFailure;

export function toAuthApiFailure(error: AppError): AuthApiFailure {
  return {
    ok: false,
    error: {
      code: error.code,
      message: error.message,
    },
  };
}

export function toAuthApiSuccess<T>(value: T): AuthApiSuccess<T> {
  return { ok: true, value };
}

export function parseAuthApiEnvelope<T>(
  payload: unknown,
  parseValue: (value: unknown) => T,
): Result<T> {
  if (!payload || typeof payload !== "object" || !("ok" in payload)) {
    return err(new AppError("NETWORK", "Resposta de autenticação inválida."));
  }

  if (payload.ok === true && "value" in payload) {
    try {
      return ok(parseValue(payload.value));
    } catch (cause) {
      return err(
        new AppError("NETWORK", "Resposta de autenticação inválida.", cause),
      );
    }
  }

  if (
    payload.ok === false &&
    "error" in payload &&
    payload.error &&
    typeof payload.error === "object" &&
    "code" in payload.error &&
    "message" in payload.error &&
    typeof payload.error.code === "string" &&
    typeof payload.error.message === "string" &&
    ERROR_CODES.includes(payload.error.code as ErrorCode)
  ) {
    return err(
      new AppError(
        payload.error.code as ErrorCode,
        payload.error.message,
      ),
    );
  }

  return err(new AppError("NETWORK", "Resposta de autenticação inválida."));
}

export function parseSessionValue(value: unknown): Session {
  return sessionSchema.parse(value);
}

export function parseOptionalSessionValue(value: unknown): Session | null {
  if (value === null) {
    return null;
  }

  return sessionSchema.parse(value);
}

export function parseNullValue(value: unknown): null {
  if (value !== null) {
    throw new Error("Resposta de logout inválida.");
  }

  return null;
}
