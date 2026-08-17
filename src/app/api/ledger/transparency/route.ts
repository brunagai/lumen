import { AppError, toAppError } from "@/lib/errors";
import { parseLedgerPageSearchParams } from "@/lib/pagination";
import { err } from "@/lib/result";
import { jsonApiResult } from "@/server/auth-http";
import { getTransparencySnapshotFromStore } from "@/server/ledger-service";

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const campaignId = searchParams.get("campaignId");

    if (!campaignId) {
      return jsonApiResult(
        err(new AppError("INVALID_INPUT", "Informe a campanha.")),
      );
    }

    return jsonApiResult(
      await getTransparencySnapshotFromStore(
        campaignId,
        parseLedgerPageSearchParams(searchParams),
      ),
    );
  } catch (cause) {
    return jsonApiResult(err(toAppError(cause)));
  }
}
