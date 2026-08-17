import {
  authAdapter,
  requireInstitutionRole,
  type Session,
} from "@/adapters/auth";
import {
  appendDonation,
  appendOutflow,
  buildReceiptUrl,
  buildTransparencySnapshot,
  computeTransparencyScore,
  createMockSignature,
  findMovement,
  getExplorerTxUrl,
  saveInvoicePatch,
  toOnChainBalance,
} from "@/adapters/solana/ledger";
import type { MovementRecord, SolanaPort } from "@/adapters/solana/types";
import { CAMPAIGN } from "@/config/campaign";
import {
  APPROVED_SUPPLIERS,
  PJ_ACCOUNT_LABEL,
} from "@/config/institution";
import type { Movement } from "@/domain/types";
import { getPublicEnv, shouldForceMockFailure } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { brlToCents, isAllowedQuickDonationBrl } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";
import {
  DONATION_NETWORK_LATENCY_MS,
  SOLANA_NETWORK_LATENCY_MS,
  rejectIfForcedFailure,
  withSimulatedNetwork,
  type SimulatedNetworkOptions,
} from "@/lib/simulated-network";

function withSolanaNetwork<T>(
  operation: () => T,
  options: Omit<SimulatedNetworkOptions, "forceFailure"> = {},
) {
  return withSimulatedNetwork(operation, {
    latencyMs: SOLANA_NETWORK_LATENCY_MS,
    forceFailure: shouldForceMockFailure,
    ...options,
  });
}

function sanitizeText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isApprovedSupplier(name: string): boolean {
  return (APPROVED_SUPPLIERS as readonly string[]).includes(name);
}

const OUTFLOW_LOCK_NAME = "lumen.solana.outflow";

async function withExclusiveLedgerAccess<T>(
  operation: () => Result<T>,
): Promise<Result<T>> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(OUTFLOW_LOCK_NAME, () => operation());
  }

  return operation();
}

function commitAffordableOutflow(
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

async function rejectWhenMockFailureForced(): Promise<Result<never> | null> {
  return rejectIfForcedFailure(shouldForceMockFailure(), {
    latencyMs: SOLANA_NETWORK_LATENCY_MS,
  });
}

async function authorizeLedgerMutation(
  presented: Session,
  options: { institutionOnly: boolean },
): Promise<Result<Session>> {
  const verified = await authAdapter.verifySession(presented);

  if (!verified.ok) {
    return verified;
  }

  if (options.institutionOnly) {
    return requireInstitutionRole(verified.value);
  }

  return verified;
}

export const mockSolanaAdapter: SolanaPort = {
  getCluster() {
    return getPublicEnv().NEXT_PUBLIC_SOLANA_CLUSTER;
  },

  async getOnChainBalance(institutionId) {
    return withSolanaNetwork(() => {
      if (institutionId !== CAMPAIGN.institutionId) {
        return toOnChainBalance(0);
      }

      return toOnChainBalance(
        buildTransparencySnapshot(CAMPAIGN.id).metrics.availableCents,
      );
    });
  },

  async confirmDonation(input) {
    const authorized = await authorizeLedgerMutation(input.session, {
      institutionOnly: false,
    });

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

    const result = await withSolanaNetwork(() => {
      const donation = {
        id: crypto.randomUUID(),
        campaignId: input.campaignId,
        amount: { amountCents: input.amountCents, currency: "BRL" as const },
        txSignature: createMockSignature(),
        confirmedAt: new Date().toISOString(),
      };

      appendDonation(donation);

      return {
        donation,
        explorerUrl: getExplorerTxUrl(donation.txSignature),
      };
    }, { latencyMs: DONATION_NETWORK_LATENCY_MS });

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
    return withSolanaNetwork(() => buildTransparencySnapshot(campaignId));
  },

  async getInstitutionDashboard(institutionId) {
    if (institutionId !== CAMPAIGN.institutionId) {
      return err(
        new AppError(
          "AUTH_FORBIDDEN",
          "Instituição não autorizada a consultar este saldo.",
        ),
      );
    }

    return withSolanaNetwork(() => {
      const snapshot = buildTransparencySnapshot(CAMPAIGN.id);
      const pendingOutflows = snapshot.movements.filter(
        (movement) => movement.status === "pending",
      );

      return {
        cluster: getPublicEnv().NEXT_PUBLIC_SOLANA_CLUSTER,
        balance: toOnChainBalance(snapshot.metrics.availableCents),
        score: computeTransparencyScore(snapshot.movements),
        pendingOutflows,
        snapshot,
      };
    });
  },

  async requestPjWithdrawal(input) {
    const authorized = await authorizeLedgerMutation(input.session, {
      institutionOnly: true,
    });

    if (!authorized.ok) {
      return authorized;
    }

    if (input.campaignId !== CAMPAIGN.id || !Number.isInteger(input.amountCents)) {
      return err(
        new AppError("INVALID_AMOUNT", "Informe um valor de saque válido."),
      );
    }

    if (input.amountCents <= 0) {
      return err(
        new AppError("INVALID_AMOUNT", "O valor do saque deve ser maior que zero."),
      );
    }

    const forcedFailure = await rejectWhenMockFailureForced();

    if (forcedFailure) {
      return forcedFailure;
    }

    const committed = await withExclusiveLedgerAccess(() =>
      commitAffordableOutflow(
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
      ),
    );

    if (!committed.ok) {
      return committed;
    }

    return withSolanaNetwork(() => committed.value, {
      ignoreForcedFailure: true,
    });
  },

  async paySupplier(input) {
    const authorized = await authorizeLedgerMutation(input.session, {
      institutionOnly: true,
    });

    if (!authorized.ok) {
      return authorized;
    }

    const supplierName = sanitizeText(input.supplierName, 80);
    const description = sanitizeText(input.description, 140);
    const invoiceNumber = sanitizeText(input.invoiceNumber, 40);

    if (!isApprovedSupplier(supplierName)) {
      return err(
        new AppError(
          "INVALID_INPUT",
          "Selecione um fornecedor homologado.",
        ),
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

    const forcedFailure = await rejectWhenMockFailureForced();

    if (forcedFailure) {
      return forcedFailure;
    }

    const committed = await withExclusiveLedgerAccess(() =>
      commitAffordableOutflow(
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
      ),
    );

    if (!committed.ok) {
      return committed;
    }

    return withSolanaNetwork(() => committed.value, {
      ignoreForcedFailure: true,
    });
  },

  async attachInvoice(input) {
    const authorized = await authorizeLedgerMutation(input.session, {
      institutionOnly: true,
    });

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

    const current = findMovement(CAMPAIGN.id, input.movementId);

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

    return withSolanaNetwork(() => {
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

      saveInvoicePatch(current.id, invoice);

      return {
        ...current,
        status: "chain_closed" as const,
        invoice,
      };
    });
  },

  getExplorerTxUrl,
};
