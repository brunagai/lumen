import { toAppError, type AppError } from "@/lib/errors";
import { err, type Result } from "@/lib/result";

export type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: AppError };

export async function runResult<T>(
  operation: () => Promise<Result<T>>,
): Promise<Result<T>> {
  try {
    return await operation();
  } catch (cause) {
    return err(toAppError(cause));
  }
}

export function toAsyncState<T>(result: Result<T>): AsyncState<T> {
  if (result.ok) {
    return { status: "success", data: result.value };
  }

  return { status: "error", error: result.error };
}
