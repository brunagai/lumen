import { delay } from "@/lib/delay";
import { AppError, toAppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export const AUTH_NETWORK_LATENCY_MS = 400;
export const SOLANA_NETWORK_LATENCY_MS = 450;
export const DONATION_NETWORK_LATENCY_MS = 900;

export const MOCK_NETWORK_FAILURE = new AppError(
  "MOCK_FAILURE",
  "Falha simulada na consulta à Solana.",
);

export type SimulatedNetworkOptions = {
  latencyMs?: number;
  forceFailure?: boolean | (() => boolean);
  failureError?: AppError;
  ignoreForcedFailure?: boolean;
};

export async function withSimulatedNetwork<T>(
  operation: () => T,
  options: SimulatedNetworkOptions = {},
): Promise<Result<T>> {
  const latencyMs = options.latencyMs ?? SOLANA_NETWORK_LATENCY_MS;
  const failureError = options.failureError ?? MOCK_NETWORK_FAILURE;

  try {
    await delay(latencyMs);

    if (!options.ignoreForcedFailure && isForcedFailure(options.forceFailure)) {
      return err(failureError);
    }

    return ok(operation());
  } catch (cause) {
    return err(toAppError(cause));
  }
}

export async function rejectIfForcedFailure(
  isForced: boolean,
  options: { latencyMs?: number; error?: AppError } = {},
): Promise<Result<never> | null> {
  if (!isForced) {
    return null;
  }

  await delay(options.latencyMs ?? SOLANA_NETWORK_LATENCY_MS);

  return err(options.error ?? MOCK_NETWORK_FAILURE);
}

function isForcedFailure(forceFailure: SimulatedNetworkOptions["forceFailure"]) {
  if (typeof forceFailure === "function") {
    return forceFailure();
  }

  return Boolean(forceFailure);
}
