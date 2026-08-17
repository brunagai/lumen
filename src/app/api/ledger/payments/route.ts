import { toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonApiResult, rejectUntrustedOrigin } from "@/server/auth-http";
import { paySupplierFromStore } from "@/server/ledger-service";

export async function POST(request: Request) {
  const untrusted = rejectUntrustedOrigin(request);

  if (untrusted) {
    return untrusted;
  }

  try {
    return jsonApiResult(await paySupplierFromStore(await request.json()));
  } catch (cause) {
    return jsonApiResult(err(toAppError(cause)));
  }
}
