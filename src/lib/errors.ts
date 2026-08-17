export const ERROR_CODES = [
  "ENV_INVALID",
  "INVALID_AMOUNT",
  "AUTH_UNAUTHENTICATED",
  "AUTH_FORBIDDEN",
  "NETWORK",
  "TX_FAILED",
  "INSUFFICIENT_FUNDS",
  "NOT_FOUND",
  "INVALID_INPUT",
  "MOCK_FAILURE",
  "UNKNOWN",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.cause = cause;
  }
}

export function toAppError(cause: unknown): AppError {
  if (cause instanceof AppError) {
    return cause;
  }

  if (cause instanceof Error) {
    return new AppError("UNKNOWN", cause.message, cause);
  }

  return new AppError("UNKNOWN", "Ocorreu um erro inesperado.", cause);
}
