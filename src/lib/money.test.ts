import { describe, expect, it } from "vitest";

import { parseBrlAmount } from "@/lib/money";

describe("parseBrlAmount", () => {
  it("accepts integer reais and comma decimals", () => {
    const integer = parseBrlAmount("10");
    const comma = parseBrlAmount("10,50");
    const dotted = parseBrlAmount("  7.5  ");

    expect(integer).toEqual({ ok: true, value: 10 });
    expect(comma).toEqual({ ok: true, value: 10.5 });
    expect(dotted).toEqual({ ok: true, value: 7.5 });
  });

  it("rejects malformed amounts", () => {
    const empty = parseBrlAmount("   ");
    const letters = parseBrlAmount("abc");
    const tooManyDecimals = parseBrlAmount("10.123");
    const negative = parseBrlAmount("-10");

    expect(empty.ok).toBe(false);
    expect(letters.ok).toBe(false);
    expect(tooManyDecimals.ok).toBe(false);
    expect(negative.ok).toBe(false);

    if (
      empty.ok ||
      letters.ok ||
      tooManyDecimals.ok ||
      negative.ok
    ) {
      return;
    }

    expect(empty.error.code).toBe("INVALID_AMOUNT");
    expect(letters.error.code).toBe("INVALID_AMOUNT");
    expect(tooManyDecimals.error.code).toBe("INVALID_AMOUNT");
    expect(negative.error.code).toBe("INVALID_AMOUNT");
  });

  it("rejects zero and non-positive values", () => {
    const zero = parseBrlAmount("0");
    const zeroDecimal = parseBrlAmount("0,00");

    expect(zero.ok).toBe(false);
    expect(zeroDecimal.ok).toBe(false);

    if (zero.ok || zeroDecimal.ok) {
      return;
    }

    expect(zero.error.message).toBe("O valor deve ser maior que zero.");
    expect(zeroDecimal.error.message).toBe("O valor deve ser maior que zero.");
  });
});
