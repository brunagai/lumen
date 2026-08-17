import { createHmac, timingSafeEqual } from "node:crypto";

import { getSessionSecret } from "@/lib/session-secret";

export type ReceiptFields = {
  number: string;
  issuer: string;
  amountCents: number;
  issuedAt: string;
};

export function receiptCanonicalPayload(fields: ReceiptFields): string {
  return [
    "v1",
    fields.number,
    fields.issuer,
    String(fields.amountCents),
    fields.issuedAt,
  ].join("\n");
}

export function signReceipt(fields: ReceiptFields, secret: string): string {
  return createHmac("sha256", secret)
    .update(receiptCanonicalPayload(fields), "utf8")
    .digest("base64url");
}

export function verifyReceiptSignature(
  fields: ReceiptFields,
  signature: string,
  secret: string,
): boolean {
  if (!signature) {
    return false;
  }

  const expected = Buffer.from(signReceipt(fields, secret));
  const presented = Buffer.from(signature);

  if (expected.length !== presented.length) {
    return false;
  }

  return timingSafeEqual(expected, presented);
}

export function buildReceiptUrl(
  fields: ReceiptFields,
  secret = getSessionSecret(),
): string {
  const params = new URLSearchParams({
    numero: fields.number,
    emitente: fields.issuer,
    valor: String(fields.amountCents),
    data: fields.issuedAt,
    sig: signReceipt(fields, secret),
  });

  return `/comprovantes/recibo?${params.toString()}`;
}
