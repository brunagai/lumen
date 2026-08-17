import { describe, expect, it } from "vitest";

import {
  buildReceiptUrl,
  signReceipt,
  verifyReceiptSignature,
} from "@/lib/receipt-signature";

const SECRET = "vitest-session-secret-value-32chars";

const receipt = {
  number: "NF 2026/0401",
  issuer: "Distribuidora Alimentos Vida Ltda",
  amountCents: 25_000,
  issuedAt: "2026-08-17T16:00:00.000Z",
};

describe("receipt signature", () => {
  it("accepts a signature generated from the same fields", () => {
    const signature = signReceipt(receipt, SECRET);

    expect(verifyReceiptSignature(receipt, signature, SECRET)).toBe(true);
  });

  it("rejects a tampered amount", () => {
    const signature = signReceipt(receipt, SECRET);

    expect(
      verifyReceiptSignature(
        { ...receipt, amountCents: 99_999 },
        signature,
        SECRET,
      ),
    ).toBe(false);
  });

  it("rejects a missing or truncated signature", () => {
    expect(verifyReceiptSignature(receipt, "", SECRET)).toBe(false);
    expect(verifyReceiptSignature(receipt, "abc", SECRET)).toBe(false);
  });

  it("embeds a verifiable signature in the receipt URL", () => {
    const url = buildReceiptUrl(receipt, SECRET);
    const params = new URL(url, "http://lumen.local").searchParams;
    const signature = params.get("sig") ?? "";

    expect(signature.length).toBeGreaterThan(20);
    expect(
      verifyReceiptSignature(
        {
          number: params.get("numero") ?? "",
          issuer: params.get("emitente") ?? "",
          amountCents: Number(params.get("valor")),
          issuedAt: params.get("data") ?? "",
        },
        signature,
        SECRET,
      ),
    ).toBe(true);
  });
});
