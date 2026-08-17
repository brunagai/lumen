import { beforeEach, describe, expect, it } from "vitest";

import {
  appendDonation,
  appendOutflow,
  buildTransparencySnapshot,
  commitAffordableOutflow,
  computeTransparencyScore,
} from "@/adapters/solana/ledger";
import { CAMPAIGN } from "@/config/campaign";
import { SCORE_PENALTY_PER_PENDING } from "@/config/institution";
import type { Donation, Movement, MovementStatus } from "@/domain/types";

const LEDGER_STORAGE_KEYS = [
  "lumen.solana.donations",
  "lumen.solana.outflows",
  "lumen.solana.invoice-patches",
] as const;

const SEED_RAISED_CENTS = 1_845_000;
const SEED_USED_CENTS = 620_000;
const SEED_AVAILABLE_CENTS = SEED_RAISED_CENTS - SEED_USED_CENTS;

function movement(status: MovementStatus): Movement {
  return {
    id: crypto.randomUUID(),
    campaignId: "fundo-teste",
    kind: status === "on_chain_inflow" ? "inflow" : "outflow",
    status,
    amount: { amountCents: 10_000, currency: "BRL" },
    occurredAt: "2026-08-17T12:00:00.000Z",
    description: "Movimentação de teste",
  };
}

function liveDonation(amountCents: number): Donation {
  return {
    id: crypto.randomUUID(),
    campaignId: CAMPAIGN.id,
    amount: { amountCents, currency: "BRL" },
    txSignature: "sig-donation-test",
    confirmedAt: "2026-08-17T15:00:00.000Z",
  };
}

function liveOutflow(amountCents: number): Movement {
  return {
    id: crypto.randomUUID(),
    campaignId: CAMPAIGN.id,
    kind: "outflow",
    status: "pending",
    amount: { amountCents, currency: "BRL" },
    occurredAt: "2026-08-17T16:00:00.000Z",
    description: "Saída de teste",
    txSignature: "sig-outflow-test",
  };
}

describe("computeTransparencyScore", () => {
  it("starts at 100 when there are no pending outflows", () => {
    const score = computeTransparencyScore([
      movement("on_chain_inflow"),
      movement("chain_closed"),
    ]);

    expect(score).toEqual({
      value: 100,
      max: 100,
      pendingCount: 0,
      penaltyPerPending: SCORE_PENALTY_PER_PENDING,
    });
  });

  it("reduces the score by the configured penalty for each pending movement", () => {
    const onePending = computeTransparencyScore([movement("pending")]);
    const twoPending = computeTransparencyScore([
      movement("pending"),
      movement("pending"),
      movement("chain_closed"),
    ]);

    expect(onePending.value).toBe(100 - SCORE_PENALTY_PER_PENDING);
    expect(onePending.pendingCount).toBe(1);
    expect(twoPending.value).toBe(100 - 2 * SCORE_PENALTY_PER_PENDING);
    expect(twoPending.pendingCount).toBe(2);
  });

  it("never drops the score below zero", () => {
    const pendingCount = Math.ceil(100 / SCORE_PENALTY_PER_PENDING) + 1;
    const movements = Array.from({ length: pendingCount }, () =>
      movement("pending"),
    );

    const score = computeTransparencyScore(movements);

    expect(score.value).toBe(0);
    expect(score.pendingCount).toBe(pendingCount);
  });
});

describe("ledger integrity and outflow commits", () => {
  beforeEach(() => {
    for (const key of LEDGER_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
  });

  it("computes seed raised, used and available balances", () => {
    const snapshot = buildTransparencySnapshot(CAMPAIGN.id);

    expect(snapshot.metrics).toEqual({
      raisedCents: SEED_RAISED_CENTS,
      usedCents: SEED_USED_CENTS,
      availableCents: SEED_AVAILABLE_CENTS,
    });
  });

  it("increases raised and available when a donation is appended", () => {
    const before = buildTransparencySnapshot(CAMPAIGN.id);
    appendDonation(liveDonation(10_000));
    const after = buildTransparencySnapshot(CAMPAIGN.id);

    expect(after.metrics.raisedCents).toBe(before.metrics.raisedCents + 10_000);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents + 10_000,
    );
  });

  it("increases used and decreases available when an outflow is appended", () => {
    const before = buildTransparencySnapshot(CAMPAIGN.id);
    appendOutflow(liveOutflow(25_000));
    const after = buildTransparencySnapshot(CAMPAIGN.id);

    expect(after.metrics.usedCents).toBe(before.metrics.usedCents + 25_000);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents - 25_000,
    );
  });

  it("commits an outflow atomically when funds are available", () => {
    const before = buildTransparencySnapshot(CAMPAIGN.id);
    const amountCents = 40_000;
    const result = commitAffordableOutflow(
      CAMPAIGN.id,
      amountCents,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(amountCents),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const after = buildTransparencySnapshot(CAMPAIGN.id);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents - amountCents,
    );
    expect(after.movements.some((item) => item.id === result.value.id)).toBe(
      true,
    );
  });

  it("refuses an outflow that exceeds the current available balance", () => {
    const before = buildTransparencySnapshot(CAMPAIGN.id);
    const amountCents = before.metrics.availableCents + 1;
    const result = commitAffordableOutflow(
      CAMPAIGN.id,
      amountCents,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(amountCents),
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(buildTransparencySnapshot(CAMPAIGN.id).metrics.availableCents).toBe(
      before.metrics.availableCents,
    );
  });

  it("does not allow a second commit to spend more than the remaining balance", () => {
    const available = buildTransparencySnapshot(CAMPAIGN.id).metrics
      .availableCents;
    const first = commitAffordableOutflow(
      CAMPAIGN.id,
      available,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(available),
    );
    const second = commitAffordableOutflow(
      CAMPAIGN.id,
      1,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(1),
    );

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(buildTransparencySnapshot(CAMPAIGN.id).metrics.availableCents).toBe(
      0,
    );
  });
});
