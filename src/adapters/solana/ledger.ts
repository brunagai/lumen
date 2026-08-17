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
import { err, ok, type Result } from "@/lib/result";
import { evidenceUrlSchema } from "@/lib/safe-url";

const DONATIONS_STORAGE_KEY = "lumen.solana.donations";
const OUTFLOWS_STORAGE_KEY = "lumen.solana.outflows";
const INVOICE_PATCHES_KEY = "lumen.solana.invoice-patches";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const moneySchema = z.object({
  amountCents: z.number().int().positive(),
  currency: z.literal("BRL"),
});

const invoiceSchema = z.object({
  number: z.string().min(1),
  issuer: z.string().min(1),
  issuedAt: z.string().min(1),
  documentUrl: evidenceUrlSchema,
});

const storedDonationSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  amount: moneySchema,
  txSignature: z.string().min(1),
  confirmedAt: z.string().min(1),
});

const storedOutflowSchema = z.object({
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

const invoicePatchesSchema = z.record(z.string(), invoiceSchema);

function readJson(key: string): unknown {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(key);
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
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

export function buildReceiptUrl(invoice: {
  number: string;
  issuer: string;
  amountCents: number;
  issuedAt: string;
}): string {
  const params = new URLSearchParams({
    numero: invoice.number,
    emitente: invoice.issuer,
    valor: String(invoice.amountCents),
    data: invoice.issuedAt,
  });

  return `/comprovantes/recibo?${params.toString()}`;
}

export function readStoredDonations(): Donation[] {
  const parsed = readJson(DONATIONS_STORAGE_KEY);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    const result = storedDonationSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

export function appendDonation(donation: Donation): void {
  writeJson(DONATIONS_STORAGE_KEY, [donation, ...readStoredDonations()]);
}

function readStoredOutflows(): Movement[] {
  const parsed = readJson(OUTFLOWS_STORAGE_KEY);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.flatMap((item) => {
    const result = storedOutflowSchema.safeParse(item);
    return result.success ? [result.data] : [];
  });
}

export function appendOutflow(movement: Movement): void {
  writeJson(OUTFLOWS_STORAGE_KEY, [movement, ...readStoredOutflows()]);
}

export function commitAffordableOutflow(
  campaignId: string,
  amountCents: number,
  insufficientFundsMessage: string,
  createMovement: () => Movement,
): Result<MovementRecord> {
  const snapshot = buildTransparencySnapshot(campaignId);

  if (amountCents > snapshot.metrics.availableCents) {
    return err(
      new AppError("INSUFFICIENT_FUNDS", insufficientFundsMessage),
    );
  }

  const movement = createMovement();
  appendOutflow(movement);

  return ok({
    ...movement,
    explorerUrl: movement.txSignature
      ? getExplorerTxUrl(movement.txSignature)
      : undefined,
  });
}

function readInvoicePatches(): Record<string, InvoiceEvidence> {
  const parsed = invoicePatchesSchema.safeParse(readJson(INVOICE_PATCHES_KEY));
  return parsed.success ? parsed.data : {};
}

export function saveInvoicePatch(
  movementId: string,
  invoice: InvoiceEvidence,
): void {
  const patches = readInvoicePatches();
  patches[movementId] = invoice;
  writeJson(INVOICE_PATCHES_KEY, patches);
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

function applyInvoicePatches(movements: Movement[]): Movement[] {
  const patches = readInvoicePatches();

  return movements.map((movement) => {
    const invoice = patches[movement.id];

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

function toMovementRecord(movement: Movement): MovementRecord {
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
  campaignId: string,
): TransparencySnapshot {
  const liveInflows = readStoredDonations()
    .filter((donation) => donation.campaignId === campaignId)
    .map(donationToMovement);

  const liveOutflows = readStoredOutflows().filter(
    (movement) => movement.campaignId === campaignId,
  );

  const movements = applyInvoicePatches([
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
  campaignId: string,
  movementId: string,
): MovementRecord | undefined {
  return buildTransparencySnapshot(campaignId).movements.find(
    (movement) => movement.id === movementId,
  );
}
