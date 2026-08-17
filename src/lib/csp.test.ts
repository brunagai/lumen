import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy } from "@/lib/csp";

describe("content security policy", () => {
  it("uses a nonce and does not allow unsafe-inline", () => {
    const csp = buildContentSecurityPolicy("abc123");

    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(csp).toContain("style-src 'self' 'nonce-abc123'");
    expect(csp).not.toContain("unsafe-inline");
  });
});
