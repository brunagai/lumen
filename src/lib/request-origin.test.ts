import { describe, expect, it } from "vitest";

import { isTrustedMutationOrigin } from "@/lib/request-origin";

describe("isTrustedMutationOrigin", () => {
  it("allows GET without origin", () => {
    expect(
      isTrustedMutationOrigin({
        method: "GET",
        origin: null,
        host: "localhost:3000",
      }),
    ).toBe(true);
  });

  it("allows same-origin POST", () => {
    expect(
      isTrustedMutationOrigin({
        method: "POST",
        origin: "http://localhost:3000",
        host: "localhost:3000",
      }),
    ).toBe(true);
  });

  it("rejects cross-origin POST", () => {
    expect(
      isTrustedMutationOrigin({
        method: "POST",
        origin: "https://evil.example",
        host: "localhost:3000",
      }),
    ).toBe(false);
  });

  it("rejects POST without origin", () => {
    expect(
      isTrustedMutationOrigin({
        method: "POST",
        origin: null,
        host: "localhost:3000",
      }),
    ).toBe(false);
  });
});
