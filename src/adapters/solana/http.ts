import type { SolanaPort } from "@/adapters/solana/types";
import { parseAuthApiEnvelope } from "@/lib/auth-api";
import { delay } from "@/lib/delay";
import { getPublicEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  donationReceiptSchema,
  getExplorerTxUrl,
  institutionDashboardSchema,
  movementRecordSchema,
  onChainBalanceSchema,
  transparencySnapshotSchema,
} from "@/lib/ledger-core";
import { err, type Result } from "@/lib/result";
import {
  DONATION_NETWORK_LATENCY_MS,
  SOLANA_NETWORK_LATENCY_MS,
} from "@/lib/simulated-network";

async function requestLedgerApi<T>(
  path: string,
  init: RequestInit,
  parseValue: (value: unknown) => T,
  latencyMs = SOLANA_NETWORK_LATENCY_MS,
): Promise<Result<T>> {
  try {
    await delay(latencyMs);

    const response = await fetch(path, {
      ...init,
      cache: "no-store",
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });

    const payload: unknown = await response.json();
    return parseAuthApiEnvelope(payload, parseValue);
  } catch (cause) {
    return err(
      new AppError(
        "NETWORK",
        "Não foi possível falar com o ledger no servidor.",
        cause,
      ),
    );
  }
}

export const httpSolanaAdapter: SolanaPort = {
  getCluster() {
    return getPublicEnv().NEXT_PUBLIC_SOLANA_CLUSTER;
  },

  async getOnChainBalance(institutionId) {
    const params = new URLSearchParams({ institutionId });

    return requestLedgerApi(
      `/api/ledger/balance?${params.toString()}`,
      { method: "GET" },
      (value) => onChainBalanceSchema.parse(value),
    );
  },

  async confirmDonation(input) {
    return requestLedgerApi(
      "/api/ledger/donations",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      (value) => donationReceiptSchema.parse(value),
      DONATION_NETWORK_LATENCY_MS,
    );
  },

  async getTransparencySnapshot(campaignId) {
    const params = new URLSearchParams({ campaignId });

    return requestLedgerApi(
      `/api/ledger/transparency?${params.toString()}`,
      { method: "GET" },
      (value) => transparencySnapshotSchema.parse(value),
    );
  },

  async getInstitutionDashboard(institutionId) {
    const params = new URLSearchParams({ institutionId });

    return requestLedgerApi(
      `/api/ledger/dashboard?${params.toString()}`,
      { method: "GET" },
      (value) => institutionDashboardSchema.parse(value),
    );
  },

  async requestPjWithdrawal(input) {
    return requestLedgerApi(
      "/api/ledger/withdrawals",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      (value) => movementRecordSchema.parse(value),
    );
  },

  async paySupplier(input) {
    return requestLedgerApi(
      "/api/ledger/payments",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      (value) => movementRecordSchema.parse(value),
    );
  },

  async attachInvoice(input) {
    return requestLedgerApi(
      "/api/ledger/invoices",
      {
        method: "POST",
        body: JSON.stringify(input),
      },
      (value) => movementRecordSchema.parse(value),
    );
  },

  getExplorerTxUrl,
};
