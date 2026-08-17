import { beforeEach, describe, expect, it } from "vitest";

import { CAMPAIGN } from "@/config/campaign";
import { SCORE_PENALTY_PER_PENDING } from "@/config/institution";
import {
  appendDonation,
  appendOutflow,
  buildTransparencySnapshot,
  commitAffordableOutflow,
  computeTransparencyScore,
  paginateTransparencySnapshot,
} from "@/lib/ledger-core";
import { emptyLedgerState, type LedgerState } from "@/lib/ledger-state";
import type { Donation, Movement, MovementStatus } from "@/domain/types";

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

describe("centralized ledger integrity and outflow commits", () => {
  let state: LedgerState;

  beforeEach(() => {
    state = emptyLedgerState();
  });

  it("computes seed raised, used and available balances", () => {
    const snapshot = buildTransparencySnapshot(state, CAMPAIGN.id);

    expect(snapshot.metrics).toEqual({
      raisedCents: SEED_RAISED_CENTS,
      usedCents: SEED_USED_CENTS,
      availableCents: SEED_AVAILABLE_CENTS,
    });
  });

  it("increases raised and available when a donation is appended", () => {
    const before = buildTransparencySnapshot(state, CAMPAIGN.id);
    state = appendDonation(state, liveDonation(10_000));
    const after = buildTransparencySnapshot(state, CAMPAIGN.id);

    expect(after.metrics.raisedCents).toBe(before.metrics.raisedCents + 10_000);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents + 10_000,
    );
  });

  it("increases used and decreases available when an outflow is appended", () => {
    const before = buildTransparencySnapshot(state, CAMPAIGN.id);
    state = appendOutflow(state, liveOutflow(25_000));
    const after = buildTransparencySnapshot(state, CAMPAIGN.id);

    expect(after.metrics.usedCents).toBe(before.metrics.usedCents + 25_000);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents - 25_000,
    );
  });

  it("commits an outflow atomically when funds are available", () => {
    const before = buildTransparencySnapshot(state, CAMPAIGN.id);
    const amountCents = 40_000;
    const result = commitAffordableOutflow(
      state,
      CAMPAIGN.id,
      amountCents,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(amountCents),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    state = result.value.state;
    const after = buildTransparencySnapshot(state, CAMPAIGN.id);
    expect(after.metrics.availableCents).toBe(
      before.metrics.availableCents - amountCents,
    );
    expect(after.movements.some((item) => item.id === result.value.record.id)).toBe(
      true,
    );
  });

  it("refuses an outflow that exceeds the current available balance", () => {
    const before = buildTransparencySnapshot(state, CAMPAIGN.id);
    const amountCents = before.metrics.availableCents + 1;
    const result = commitAffordableOutflow(
      state,
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
    expect(buildTransparencySnapshot(state, CAMPAIGN.id).metrics.availableCents).toBe(
      before.metrics.availableCents,
    );
  });

  it("does not allow a second commit to spend more than the remaining balance", () => {
    const available = buildTransparencySnapshot(state, CAMPAIGN.id).metrics
      .availableCents;
    const first = commitAffordableOutflow(
      state,
      CAMPAIGN.id,
      available,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(available),
    );

    expect(first.ok).toBe(true);
    if (!first.ok) {
      return;
    }

    const second = commitAffordableOutflow(
      first.value.state,
      CAMPAIGN.id,
      1,
      "Saldo on-chain insuficiente para este saque.",
      () => liveOutflow(1),
    );

    expect(second.ok).toBe(false);
    if (second.ok) {
      return;
    }

    expect(second.error.code).toBe("INSUFFICIENT_FUNDS");
    expect(
      buildTransparencySnapshot(first.value.state, CAMPAIGN.id).metrics
        .availableCents,
    ).toBe(0);
  });

  it("keeps full-ledger metrics when the movement list is paginated", () => {
    const snapshot = buildTransparencySnapshot(emptyLedgerState(), CAMPAIGN.id);
    const paged = paginateTransparencySnapshot(snapshot, 1, 3);

    expect(paged.metrics).toEqual(snapshot.metrics);
    expect(paged.movements).toHaveLength(3);
    expect(paged.page).toEqual({
      page: 1,
      pageSize: 3,
      total: snapshot.movements.length,
      hasMore: true,
    });
    expect(paged.movements[0]?.id).toBe(snapshot.movements[0]?.id);
  });
});
