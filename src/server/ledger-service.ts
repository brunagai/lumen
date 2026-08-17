import "server-only";

import { z } from "zod";

import { sessionSchema } from "@/adapters/auth/types";
import { shouldForceMockFailure } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  attachInvoice,
  confirmDonation,
  paySupplier,
  readInstitutionDashboard,
  readOnChainBalance,
  readTransparencySnapshot,
  requestPjWithdrawal,
} from "@/lib/ledger-operations";
import { err, ok, type Result } from "@/lib/result";
import { MOCK_NETWORK_FAILURE } from "@/lib/simulated-network";
import { verifyPresentedSession } from "@/server/auth-service";
import {
  loadLedgerState,
  saveLedgerState,
  withLedgerLock,
} from "@/server/ledger-store";
import { readSessionCookie } from "@/server/session-cookie";

const donationBodySchema = z.object({
  campaignId: z.string().min(1),
  amountCents: z.number().int(),
  session: sessionSchema,
});

const withdrawalBodySchema = z.object({
  campaignId: z.string().min(1),
  amountCents: z.number().int(),
  session: sessionSchema,
});

const paymentBodySchema = z.object({
  campaignId: z.string().min(1),
  amountCents: z.number().int(),
  supplierName: z.string().min(1),
  description: z.string().min(1),
  invoiceNumber: z.string().min(1),
  session: sessionSchema,
});

const invoiceBodySchema = z.object({
  movementId: z.string().min(1),
  invoiceNumber: z.string().min(1),
  issuer: z.string().min(1),
  session: sessionSchema,
});

function rejectForcedFailure(): AppError | null {
  if (!shouldForceMockFailure()) {
    return null;
  }

  return MOCK_NETWORK_FAILURE;
}

async function commitMutation<T>(
  mutate: (
    state: Awaited<ReturnType<typeof loadLedgerState>>,
  ) => Result<{ value: T; state: Awaited<ReturnType<typeof loadLedgerState>> }>,
): Promise<Result<T>> {
  return withLedgerLock(async () => {
    const result = mutate(await loadLedgerState());

    if (!result.ok) {
      return result;
    }

    await saveLedgerState(result.value.state);
    return ok(result.value.value);
  });
}

export async function getTransparencySnapshotFromStore(campaignId: string) {
  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return withLedgerLock(async () =>
    readTransparencySnapshot(await loadLedgerState(), campaignId),
  );
}

export async function getOnChainBalanceFromStore(institutionId: string) {
  const session = await readSessionCookie();
  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return withLedgerLock(async () =>
    readOnChainBalance(await loadLedgerState(), session, institutionId),
  );
}

export async function getInstitutionDashboardFromStore(institutionId: string) {
  const session = await readSessionCookie();
  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return withLedgerLock(async () =>
    readInstitutionDashboard(await loadLedgerState(), session, institutionId),
  );
}

export async function confirmDonationFromStore(body: unknown) {
  const parsed = donationBodySchema.safeParse(body);

  if (!parsed.success) {
    return err(new AppError("INVALID_INPUT", "Dados de doação inválidos."));
  }

  const authorized = await verifyPresentedSession(parsed.data.session);

  if (!authorized.ok) {
    return authorized;
  }

  const forced = rejectForcedFailure();

  if (forced) {
    return err(
      new AppError(
        "TX_FAILED",
        "Não foi possível registrar a doação na Solana. Tente novamente.",
        forced,
      ),
    );
  }

  return commitMutation((state) =>
    confirmDonation(state, authorized.value, parsed.data),
  );
}

export async function requestPjWithdrawalFromStore(body: unknown) {
  const parsed = withdrawalBodySchema.safeParse(body);

  if (!parsed.success) {
    return err(new AppError("INVALID_INPUT", "Dados de saque inválidos."));
  }

  const authorized = await verifyPresentedSession(parsed.data.session);

  if (!authorized.ok) {
    return authorized;
  }

  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return commitMutation((state) =>
    requestPjWithdrawal(state, authorized.value, parsed.data),
  );
}

export async function paySupplierFromStore(body: unknown) {
  const parsed = paymentBodySchema.safeParse(body);

  if (!parsed.success) {
    return err(new AppError("INVALID_INPUT", "Dados de pagamento inválidos."));
  }

  const authorized = await verifyPresentedSession(parsed.data.session);

  if (!authorized.ok) {
    return authorized;
  }

  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return commitMutation((state) =>
    paySupplier(state, authorized.value, parsed.data),
  );
}

export async function attachInvoiceFromStore(body: unknown) {
  const parsed = invoiceBodySchema.safeParse(body);

  if (!parsed.success) {
    return err(new AppError("INVALID_INPUT", "Dados da nota fiscal inválidos."));
  }

  const authorized = await verifyPresentedSession(parsed.data.session);

  if (!authorized.ok) {
    return authorized;
  }

  const forced = rejectForcedFailure();

  if (forced) {
    return err(forced);
  }

  return commitMutation((state) =>
    attachInvoice(state, authorized.value, parsed.data),
  );
}
