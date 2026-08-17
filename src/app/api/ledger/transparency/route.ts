import { AppError, toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonApiResult } from "@/server/auth-http";
import { getTransparencySnapshotFromStore } from "@/server/ledger-service";

export async function GET(request: Request) {
  try {
    const campaignId = new URL(request.url).searchParams.get("campaignId");

    if (!campaignId) {
      return jsonApiResult(
        err(new AppError("INVALID_INPUT", "Informe a campanha.")),
      );
    }

    return jsonApiResult(await getTransparencySnapshotFromStore(campaignId));
  } catch (cause) {
    return jsonApiResult(err(toAppError(cause)));
  }
}
