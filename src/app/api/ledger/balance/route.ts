import { AppError, toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonApiResult } from "@/server/auth-http";
import { getOnChainBalanceFromStore } from "@/server/ledger-service";

export async function GET(request: Request) {
  try {
    const institutionId = new URL(request.url).searchParams.get(
      "institutionId",
    );

    if (!institutionId) {
      return jsonApiResult(
        err(new AppError("INVALID_INPUT", "Informe a instituição.")),
      );
    }

    return jsonApiResult(await getOnChainBalanceFromStore(institutionId));
  } catch (cause) {
    return jsonApiResult(err(toAppError(cause)));
  }
}
