import { toAppError } from "@/lib/errors";
import { err } from "@/lib/result";
import { jsonAuthResult } from "@/server/auth-http";
import { getCurrentSession } from "@/server/auth-service";

export async function GET() {
  try {
    return jsonAuthResult(await getCurrentSession());
  } catch (cause) {
    return jsonAuthResult(err(toAppError(cause)));
  }
}
