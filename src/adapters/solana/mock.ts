import { z } from "zod";

import type {
  MovementRecord,
  SolanaPort,
  TransparencySnapshot,
} from "@/adapters/solana/types";
import { CAMPAIGN } from "@/config/campaign";
import { SEED_MOVEMENTS } from "@/data/mocks/movements";
import type { Donation, Movement } from "@/domain/types";
import { delay } from "@/lib/delay";
import { getPublicEnv, shouldForceMockFailure } from "@/lib/env";
import { AppError, toAppError } from "@/lib/errors";
import { brlToCents, isAllowedQuickDonationBrl } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";

const MOCK_LATENCY_MS = 450;
const DONATION_LATENCY_MS = 900;
const MOCK_USDC_RATE = 5.6;
const DONATIONS_STORAGE_KEY = "lumen.solana.donations";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

const storedDonationSchema = z.object({
  id: z.string().min(1),
  campaignId: z.string().min(1),
  amount: z.object({
    amountCents: z.number().int().positive(),
    currency: z.literal("BRL"),
  }),
  txSignature: z.string().min(1),
  confirmedAt: z.string().min(1),
});

async function withSimulatedNetwork<T>(
  operation: () => T,
  latencyMs = MOCK_LATENCY_MS,
): Promise<Result<T>> {
  try {
    await delay(latencyMs);

    if (shouldForceMockFailure()) {
      return err(
        new AppError("MOCK_FAILURE", "Falha simulada na consulta à Solana."),
      );
    }

    return ok(operation());
  } catch (cause) {
    return err(toAppError(cause));
  }
}

function createMockSignature(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return Array.from(
    bytes,
    (byte) => BASE58_ALPHABET[byte % BASE58_ALPHABET.length],
  ).join("");
}

function readStoredDonations(): Donation[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(DONATIONS_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.flatMap((item) => {
      const result = storedDonationSchema.safeParse(item);
      return result.success ? [result.data] : [];
    });
  } catch {
    window.localStorage.removeItem(DONATIONS_STORAGE_KEY);
    return [];
  }
}

function appendDonation(donation: Donation): void {
  if (typeof window === "undefined") {
    return;
  }

  const donations = [donation, ...readStoredDonations()];
  window.localStorage.setItem(DONATIONS_STORAGE_KEY, JSON.stringify(donations));
}

function getExplorerTxUrl(signature: string): string {
  const env = getPublicEnv();
  const url = new URL(`/tx/${signature}`, env.NEXT_PUBLIC_EXPLORER_BASE_URL);
  url.searchParams.set("cluster", env.NEXT_PUBLIC_SOLANA_CLUSTER);
  return url.toString();
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

function toMovementRecord(movement: Movement): MovementRecord {
  return {
    ...movement,
    explorerUrl: movement.txSignature
      ? getExplorerTxUrl(movement.txSignature)
      : undefined,
  };
}

function buildTransparencySnapshot(campaignId: string): TransparencySnapshot {
  const liveInflows = readStoredDonations()
    .filter((donation) => donation.campaignId === campaignId)
    .map(donationToMovement);

  const movements = [...liveInflows, ...SEED_MOVEMENTS]
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

export const mockSolanaAdapter: SolanaPort = {
  getCluster() {
    return getPublicEnv().NEXT_PUBLIC_SOLANA_CLUSTER;
  },

  async getOnChainBalance(institutionId) {
    return withSimulatedNetwork(() => {
      if (institutionId !== CAMPAIGN.institutionId) {
        return {
          availableBrlCents: 0,
          availableUsdc: 0,
        };
      }

      const availableBrlCents = buildTransparencySnapshot(CAMPAIGN.id).metrics
        .availableCents;

      return {
        availableBrlCents,
        availableUsdc: Number(
          (availableBrlCents / 100 / MOCK_USDC_RATE).toFixed(2),
        ),
      };
    });
  },

  async confirmDonation(input) {
    const amountBrl = input.amountCents / 100;

    if (
      input.campaignId !== CAMPAIGN.id ||
      !Number.isInteger(input.amountCents) ||
      !isAllowedQuickDonationBrl(amountBrl) ||
      brlToCents(amountBrl) !== input.amountCents
    ) {
      return err(
        new AppError(
          "INVALID_AMOUNT",
          "Selecione um valor de doação válido (R$ 10, R$ 50 ou R$ 100).",
        ),
      );
    }

    if (!input.donorId.trim()) {
      return err(
        new AppError(
          "AUTH_UNAUTHENTICATED",
          "Entre para registrar a doação na Solana.",
        ),
      );
    }

    const result = await withSimulatedNetwork(() => {
      const donation: Donation = {
        id: crypto.randomUUID(),
        campaignId: input.campaignId,
        amount: { amountCents: input.amountCents, currency: "BRL" },
        txSignature: createMockSignature(),
        confirmedAt: new Date().toISOString(),
      };

      appendDonation(donation);

      return {
        donation,
        explorerUrl: getExplorerTxUrl(donation.txSignature),
      };
    }, DONATION_LATENCY_MS);

    if (!result.ok) {
      return err(
        new AppError(
          "TX_FAILED",
          "Não foi possível registrar a doação na Solana. Tente novamente.",
          result.error,
        ),
      );
    }

    return result;
  },

  async getTransparencySnapshot(campaignId) {
    return withSimulatedNetwork(() => buildTransparencySnapshot(campaignId));
  },

  getExplorerTxUrl,
};
