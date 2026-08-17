import { z } from "zod";

import type {
  MovementRecord,
  OnChainBalance,
  TransparencyScore,
  TransparencySnapshot,
} from "@/adapters/solana/types";
import {
  MOCK_USDC_RATE,
  SCORE_PENALTY_PER_PENDING,
} from "@/config/institution";
import { SEED_MOVEMENTS } from "@/data/mocks/movements";
import type { Donation, InvoiceEvidence, Movement } from "@/domain/types";
import { getPublicEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  emptyLedgerState,
  type LedgerState,
} from "@/lib/ledger-state";
import { err, ok, type Result } from "@/lib/result";
import { evidenceUrlSchema } from "@/lib/safe-url";

const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const moneySchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.literal("BRL"),
});

export const invoiceSchema = z.object({
  number: z.string().min(1),
  issuer: z.string().min(1),
  issuedAt: z.string().min(1),
  documentUrl: evidenceUrlSchema,
});

export const storedDonationSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  amount: moneySchema,
  txSignature: z.string().min(1),
  confirmedAt: z.string().min(1),
});

export const storedOutflowSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  kind: z.literal("outflow"),
  status: z.enum(["chain_closed", "pending"]),
  amount: moneySchema,
  occurredAt: z.string().min(1),
  description: z.string().min(1),
  txSignature: z.string().optional(),
  supplierName: z.string().optional(),
  invoice: invoiceSchema.optional(),
});

export const movementRecordSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  kind: z.enum(["inflow", "outflow"]),
  status: z.enum(["on_chain_inflow", "chain_closed", "pending"]),
  amount: moneySchema,
  occurredAt: z.string().min(1),
  description: z.string().min(1),
  txSignature: z.string().optional(),
  supplierName: z.string().optional(),
  invoice: invoiceSchema.optional(),
  explorerUrl: z.string().min(1).optional(),
});

export const donationReceiptSchema = z.object({
  donation: storedDonationSchema,
  explorerUrl: z.string().min(1),
});

export const transparencySnapshotSchema = z.object({
  metrics: z.object({
    raisedCents: z.number().int().nonnegative(),
    usedCents: z.number().int().nonnegative(),
    availableCents: z.number().int().nonnegative(),
  }),
  movements: z.array(movementRecordSchema),
});

export const onChainBalanceSchema = z.object({
  availableBrlCents: z.number().int().nonnegative(),
  availableUsdc: z.number().nonnegative(),
});

export const transparencyScoreSchema = z.object({
  value: z.number().int().nonnegative(),
  max: z.literal(100),
  pendingCount: z.number().int().nonnegative(),
  penaltyPerPending: z.number().int().positive(),
});

export const institutionDashboardSchema = z.object({
  cluster: z.enum(["devnet", "testnet", "mainnet-beta"]),
  balance: onChainBalanceSchema,
  score: transparencyScoreSchema,
  pendingOutflows: z.array(movementRecordSchema),
  snapshot: transparencySnapshotSchema,
});

const invoicePatchesSchema = z.record(z.string(), invoiceSchema);

const ledgerStateSchema = z.object({
  donations: z.array(storedDonationSchema),
  outflows: z.array(storedOutflowSchema),
  invoicePatches: invoicePatchesSchema,
});

export function parseLedgerState(value: unknown): LedgerState {
  const parsed = ledgerStateSchema.safeParse(value);

  if (!parsed.success) {
    return emptyLedgerState();
  }

  return parsed.data;
}

export function createMockSignature(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => BASE58_ALPHABET[byte % BASE58_ALPHABET.length],
  ).join("");
}

export function getExplorerTxUrl(signature: string): string {
  const env = getPublicEnv();
  const url = new URL(`/tx/${signature}`, env.NEXT_PUBLIC_EXPLORER_BASE_URL);
  url.searchParams.set("cluster", env.NEXT_PUBLIC_SOLANA_CLUSTER);
  return url.toString();
}

export function appendDonation(
  state: LedgerState,
  donation: Donation,
): LedgerState {
  return {
    ...state,
    donations: [donation, ...state.donations],
  };
}

export function appendOutflow(
  state: LedgerState,
  movement: Movement,
): LedgerState {
  return {
    ...state,
    outflows: [movement, ...state.outflows],
  };
}

export function saveInvoicePatch(
  state: LedgerState,
  movementId: string,
  invoice: InvoiceEvidence,
): LedgerState {
  return {
    ...state,
    invoicePatches: {
      ...state.invoicePatches,
      [movementId]: invoice,
    },
  };
}

export function commitAffordableOutflow(
  state: LedgerState,
  campaignId: string,
  amountCents: number,
  insufficientFundsMessage: string,
  createMovement: () => Movement,
): Result<{ record: MovementRecord; state: LedgerState }> {
  const snapshot = buildTransparencySnapshot(state, campaignId);

  if (amountCents > snapshot.metrics.availableCents) {
    return err(
      new AppError("INSUFFICIENT_FUNDS", insufficientFundsMessage),
    );
  }

  const movement = createMovement();
  const next = appendOutflow(state, movement);

  return ok({
    record: toMovementRecord(movement),
    state: next,
  });
}

function donationToMovement(donation: Donation): Movement {
  return {
    id: donation.id,
    campaignId: donation.campaignId,
    kind: "inflow",
    status: "on_chain_inflow",
    amount: donation.amount,
    occurredAt: donation.confirmedAt,
    description: "Doação confirmada na Solana",
    txSignature: donation.txSignature,
  };
}

function applyInvoicePatches(
  state: LedgerState,
  movements: Movement[],
): Movement[] {
  return movements.map((movement) => {
    const invoice = state.invoicePatches[movement.id];

    if (!invoice) {
      return movement;
    }

    return {
      ...movement,
      status: "chain_closed",
      invoice,
    };
  });
}

export function toMovementRecord(movement: Movement): MovementRecord {
  return {
    ...movement,
    explorerUrl: movement.txSignature
      ? getExplorerTxUrl(movement.txSignature)
      : undefined,
  };
}

export function computeTransparencyScore(
  movements: Movement[],
): TransparencyScore {
  const pendingCount = movements.filter(
    (movement) => movement.status === "pending",
  ).length;

  return {
    value: Math.max(0, 100 - pendingCount * SCORE_PENALTY_PER_PENDING),
    max: 100,
    pendingCount,
    penaltyPerPending: SCORE_PENALTY_PER_PENDING,
  };
}

export function toOnChainBalance(availableBrlCents: number): OnChainBalance {
  return {
    availableBrlCents,
    availableUsdc: Number(
      (availableBrlCents / 100 / MOCK_USDC_RATE).toFixed(2),
    ),
  };
}

export function buildTransparencySnapshot(
  state: LedgerState,
  campaignId: string,
): TransparencySnapshot {
  const liveInflows = state.donations
    .filter((donation) => donation.campaignId === campaignId)
    .map(donationToMovement);

  const liveOutflows = state.outflows.filter(
    (movement) => movement.campaignId === campaignId,
  );

  const movements = applyInvoicePatches(state, [
    ...liveInflows,
    ...liveOutflows,
    ...SEED_MOVEMENTS,
  ])
    .filter((movement) => movement.campaignId === campaignId)
    .sort(
      (left, right) =>
        new Date(right.occurredAt).getTime() -
        new Date(left.occurredAt).getTime(),
    );

  const raisedCents = movements
    .filter((movement) => movement.kind === "inflow")
    .reduce((total, movement) => total + movement.amount.amountCents, 0);

  const usedCents = movements
    .filter((movement) => movement.kind === "outflow")
    .reduce((total, movement) => total + movement.amount.amountCents, 0);

  return {
    metrics: {
      raisedCents,
      usedCents,
      availableCents: Math.max(raisedCents - usedCents, 0),
    },
    movements: movements.map(toMovementRecord),
  };
}

export function findMovement(
  state: LedgerState,
  campaignId: string,
  movementId: string,
): MovementRecord | undefined {
  return buildTransparencySnapshot(state, campaignId).movements.find(
    (movement) => movement.id === movementId,
  );
}
