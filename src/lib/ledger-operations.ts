import type { Session } from "@/adapters/auth/types";
import type {
  AttachInvoiceInput,
  ConfirmDonationInput,
  DonationReceipt,
  InstitutionDashboardSnapshot,
  MovementRecord,
  OnChainBalance,
  PaySupplierInput,
  PjWithdrawalInput,
  TransparencySnapshot,
} from "@/adapters/solana/types";
import { CAMPAIGN } from "@/config/campaign";
import {
  APPROVED_SUPPLIERS,
  PJ_ACCOUNT_LABEL,
} from "@/config/institution";
import { getPublicEnv } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { authorizeLedgerAccess } from "@/lib/ledger-auth";
import {
  appendDonation,
  buildReceiptUrl,
  buildTransparencySnapshot,
  commitAffordableOutflow,
  computeTransparencyScore,
  createMockSignature,
  findMovement,
  getExplorerTxUrl,
  saveInvoicePatch,
  toOnChainBalance,
} from "@/lib/ledger-core";
import type { LedgerState } from "@/lib/ledger-state";
import { brlToCents, isAllowedQuickDonationBrl } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";

export type LedgerMutationResult<T> = Result<{ value: T; state: LedgerState }>;

function sanitizeText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isApprovedSupplier(name: string): boolean {
  return (APPROVED_SUPPLIERS as readonly string[]).includes(name);
}

export function readTransparencySnapshot(
  state: LedgerState,
  campaignId: string,
): Result<TransparencySnapshot> {
  if (campaignId !== CAMPAIGN.id) {
    return err(new AppError("NOT_FOUND", "Campanha não encontrada."));
  }

  return ok(buildTransparencySnapshot(state, campaignId));
}

export function readOnChainBalance(
  state: LedgerState,
  session: Session | null,
  institutionId: string,
): Result<OnChainBalance> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: true });

  if (!authorized.ok) {
    return authorized;
  }

  if (institutionId !== CAMPAIGN.institutionId) {
    return err(
      new AppError(
        "AUTH_FORBIDDEN",
        "Instituição não autorizada a consultar este saldo.",
      ),
    );
  }

  return ok(
    toOnChainBalance(
      buildTransparencySnapshot(state, CAMPAIGN.id).metrics.availableCents,
    ),
  );
}

export function readInstitutionDashboard(
  state: LedgerState,
  session: Session | null,
  institutionId: string,
): Result<InstitutionDashboardSnapshot> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: true });

  if (!authorized.ok) {
    return authorized;
  }

  if (institutionId !== CAMPAIGN.institutionId) {
    return err(
      new AppError(
        "AUTH_FORBIDDEN",
        "Instituição não autorizada a consultar este saldo.",
      ),
    );
  }

  const snapshot = buildTransparencySnapshot(state, CAMPAIGN.id);
  const pendingOutflows = snapshot.movements.filter(
    (movement) => movement.status === "pending",
  );

  return ok({
    cluster: getPublicEnv().NEXT_PUBLIC_SOLANA_CLUSTER,
    balance: toOnChainBalance(snapshot.metrics.availableCents),
    score: computeTransparencyScore(snapshot.movements),
    pendingOutflows,
    snapshot,
  });
}

export function confirmDonation(
  state: LedgerState,
  session: Session | null,
  input: Pick<ConfirmDonationInput, "campaignId" | "amountCents">,
): LedgerMutationResult<DonationReceipt> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: false });

  if (!authorized.ok) {
    return authorized;
  }

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

  const donation = {
    id: crypto.randomUUID(),
    campaignId: input.campaignId,
    amount: { amountCents: input.amountCents, currency: "BRL" as const },
    txSignature: createMockSignature(),
    confirmedAt: new Date().toISOString(),
  };

  return ok({
    value: {
      donation,
      explorerUrl: getExplorerTxUrl(donation.txSignature),
    },
    state: appendDonation(state, donation),
  });
}

export function requestPjWithdrawal(
  state: LedgerState,
  session: Session | null,
  input: Pick<PjWithdrawalInput, "campaignId" | "amountCents">,
): LedgerMutationResult<MovementRecord> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: true });

  if (!authorized.ok) {
    return authorized;
  }

  if (input.campaignId !== CAMPAIGN.id || !Number.isInteger(input.amountCents)) {
    return err(new AppError("INVALID_AMOUNT", "Informe um valor de saque válido."));
  }

  if (input.amountCents <= 0) {
    return err(
      new AppError("INVALID_AMOUNT", "O valor do saque deve ser maior que zero."),
    );
  }

  const committed = commitAffordableOutflow(
    state,
    input.campaignId,
    input.amountCents,
    "Saldo on-chain insuficiente para este saque.",
    () => {
      const occurredAt = new Date().toISOString();

      return {
        id: crypto.randomUUID(),
        campaignId: input.campaignId,
        kind: "outflow",
        status: "pending",
        amount: { amountCents: input.amountCents, currency: "BRL" },
        occurredAt,
        description: "Saque para conta PJ — nota fiscal pendente",
        supplierName: PJ_ACCOUNT_LABEL,
        txSignature: createMockSignature(),
      };
    },
  );

  if (!committed.ok) {
    return committed;
  }

  return ok({
    value: committed.value.record,
    state: committed.value.state,
  });
}

export function paySupplier(
  state: LedgerState,
  session: Session | null,
  input: Omit<PaySupplierInput, "session">,
): LedgerMutationResult<MovementRecord> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: true });

  if (!authorized.ok) {
    return authorized;
  }

  const supplierName = sanitizeText(input.supplierName, 80);
  const description = sanitizeText(input.description, 140);
  const invoiceNumber = sanitizeText(input.invoiceNumber, 40);

  if (!isApprovedSupplier(supplierName)) {
    return err(
      new AppError("INVALID_INPUT", "Selecione um fornecedor homologado."),
    );
  }

  if (description.length < 8 || invoiceNumber.length < 3) {
    return err(
      new AppError(
        "INVALID_INPUT",
        "Informe a descrição da despesa e o número da nota fiscal.",
      ),
    );
  }

  if (
    input.campaignId !== CAMPAIGN.id ||
    !Number.isInteger(input.amountCents) ||
    input.amountCents <= 0
  ) {
    return err(
      new AppError("INVALID_AMOUNT", "Informe um valor de pagamento válido."),
    );
  }

  const committed = commitAffordableOutflow(
    state,
    input.campaignId,
    input.amountCents,
    "Saldo on-chain insuficiente para pagar este fornecedor.",
    () => {
      const occurredAt = new Date().toISOString();
      const invoice = {
        number: invoiceNumber,
        issuer: supplierName,
        issuedAt: occurredAt,
        documentUrl: buildReceiptUrl({
          number: invoiceNumber,
          issuer: supplierName,
          amountCents: input.amountCents,
          issuedAt: occurredAt,
        }),
      };

      return {
        id: crypto.randomUUID(),
        campaignId: input.campaignId,
        kind: "outflow",
        status: "chain_closed",
        amount: { amountCents: input.amountCents, currency: "BRL" },
        occurredAt,
        description,
        supplierName,
        txSignature: createMockSignature(),
        invoice,
      };
    },
  );

  if (!committed.ok) {
    return committed;
  }

  return ok({
    value: committed.value.record,
    state: committed.value.state,
  });
}

export function attachInvoice(
  state: LedgerState,
  session: Session | null,
  input: Omit<AttachInvoiceInput, "session">,
): LedgerMutationResult<MovementRecord> {
  const authorized = authorizeLedgerAccess(session, { institutionOnly: true });

  if (!authorized.ok) {
    return authorized;
  }

  const invoiceNumber = sanitizeText(input.invoiceNumber, 40);
  const issuer = sanitizeText(input.issuer, 80);

  if (invoiceNumber.length < 3 || issuer.length < 3) {
    return err(
      new AppError(
        "INVALID_INPUT",
        "Informe o número da nota fiscal e o emitente.",
      ),
    );
  }

  const current = findMovement(state, CAMPAIGN.id, input.movementId);

  if (!current || current.kind !== "outflow") {
    return err(
      new AppError("NOT_FOUND", "Movimentação pendente não encontrada."),
    );
  }

  if (current.status !== "pending") {
    return err(
      new AppError(
        "INVALID_INPUT",
        "Esta saída já possui comprovante vinculado.",
      ),
    );
  }

  const issuedAt = new Date().toISOString();
  const invoice = {
    number: invoiceNumber,
    issuer,
    issuedAt,
    documentUrl: buildReceiptUrl({
      number: invoiceNumber,
      issuer,
      amountCents: current.amount.amountCents,
      issuedAt,
    }),
  };

  return ok({
    value: {
      ...current,
      status: "chain_closed" as const,
      invoice,
    },
    state: saveInvoicePatch(state, current.id, invoice),
  });
}
