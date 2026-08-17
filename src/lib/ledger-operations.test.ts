import { describe, expect, it } from "vitest";

import type { Session } from "@/adapters/auth/types";
import { CAMPAIGN } from "@/config/campaign";
import { APPROVED_SUPPLIERS } from "@/config/institution";
import {
  attachInvoice,
  confirmDonation,
  paySupplier,
  readInstitutionDashboard,
  requestPjWithdrawal,
} from "@/lib/ledger-operations";
import { emptyLedgerState } from "@/lib/ledger-state";

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

describe("ledger operations against the centralized store", () => {
  it("rejects donations without a session", () => {
    const result = confirmDonation(emptyLedgerState(), null, {
      campaignId: CAMPAIGN.id,
      amountCents: 10_000,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("AUTH_UNAUTHENTICATED");
  });

  it("records a donation for an authenticated donor", () => {
    const result = confirmDonation(emptyLedgerState(), donor, {
      campaignId: CAMPAIGN.id,
      amountCents: 10_000,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.value.donation.amount.amountCents).toBe(10_000);
    expect(result.value.state.donations).toHaveLength(1);
  });

  it("rejects a donor from reading the institution dashboard", () => {
    const result = readInstitutionDashboard(
      emptyLedgerState(),
      donor,
      CAMPAIGN.institutionId,
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("AUTH_FORBIDDEN");
  });

  it("rejects a donor from withdrawing", () => {
    const result = requestPjWithdrawal(emptyLedgerState(), donor, {
      campaignId: CAMPAIGN.id,
      amountCents: 10_000,
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("AUTH_FORBIDDEN");
  });

  it("lets the institution withdraw and then refuses a second spend beyond the remainder", () => {
    const first = requestPjWithdrawal(emptyLedgerState(), institution, {
      campaignId: CAMPAIGN.id,
      amountCents: 1_225_000,
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = requestPjWithdrawal(first.value.state, institution, {
      campaignId: CAMPAIGN.id,
      amountCents: 1,
    });

    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error.code).toBe("INSUFFICIENT_FUNDS");
  });

  it("closes a pending invoice only once", () => {
    const withdrawn = requestPjWithdrawal(emptyLedgerState(), institution, {
      campaignId: CAMPAIGN.id,
      amountCents: 20_000,
    });

    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) {
      return;
    }

    const movementId = withdrawn.value.value.id;
    const first = attachInvoice(withdrawn.value.state, institution, {
      movementId,
      invoiceNumber: "NF-100",
      issuer: "Casa da Mulher",
    });

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = attachInvoice(first.value.state, institution, {
      movementId,
      invoiceNumber: "NF-101",
      issuer: "Casa da Mulher",
    });

    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error.code).toBe("INVALID_INPUT");
  });

  it("pays an approved supplier and closes the chain", () => {
    const result = paySupplier(emptyLedgerState(), institution, {
      campaignId: CAMPAIGN.id,
      amountCents: 25_000,
      supplierName: APPROVED_SUPPLIERS[0],
      description: "Compra de kits de higiene",
      invoiceNumber: "NF 2026/0401",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.value.status).toBe("chain_closed");
    expect(result.value.value.invoice?.number).toBe("NF 2026/0401");
    expect(result.value.value.invoice?.documentUrl).toContain("sig=");
  });
});
