import { describe, expect, it } from "vitest";

import type { Session } from "@/adapters/auth/types";
import { authorizeLedgerAccess } from "@/lib/ledger-auth";

const donor: Session = {
  userId: "donor_mock",
  displayName: "Doadora",
  method: "email",
  role: "donor",
};

const institution: Session = {
  userId: "inst_casa-da-mulher",
  displayName: "Casa da Mulher",
  method: "email",
  role: "institution",
};

describe("authorizeLedgerAccess", () => {
  it("rejects missing sessions", () => {
    const result = authorizeLedgerAccess(null, { institutionOnly: false });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("AUTH_UNAUTHENTICATED");
  });

  it("allows an authenticated donor to donate", () => {
    const result = authorizeLedgerAccess(donor, { institutionOnly: false });

    expect(result).toEqual({ ok: true, value: donor });
  });

  it("rejects a donor from institution-only operations", () => {
    const result = authorizeLedgerAccess(donor, { institutionOnly: true });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("AUTH_FORBIDDEN");
  });

  it("allows the institution role on institution-only operations", () => {
    const result = authorizeLedgerAccess(institution, {
      institutionOnly: true,
    });

    expect(result).toEqual({ ok: true, value: institution });
  });
});
