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
import type { SolanaPort } from "@/adapters/solana/types";
import { CAMPAIGN } from "@/config/campaign";
import {
  APPROVED_SUPPLIERS,
  PJ_ACCOUNT_LABEL,
} from "@/config/institution";
import type { Movement } from "@/domain/types";
import { delay } from "@/lib/delay";
import { getPublicEnv, shouldForceMockFailure } from "@/lib/env";
import { AppError, toAppError } from "@/lib/errors";
import { brlToCents, isAllowedQuickDonationBrl } from "@/lib/money";
import { err, ok, type Result } from "@/lib/result";

const MOCK_LATENCY_MS = 450;
const DONATION_LATENCY_MS = 900;

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

function sanitizeText(value: string, maxLength: number): string {
  return value.trim().replace(/\s+/g, " ").slice(0, maxLength);
}

function isApprovedSupplier(name: string): boolean {
  return (APPROVED_SUPPLIERS as readonly string[]).includes(name);
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
    return withSimulatedNetwork(() => {
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

    const result = await withSimulatedNetwork(() => {
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

  async getInstitutionDashboard(institutionId) {
    if (institutionId !== CAMPAIGN.institutionId) {
      return err(
        new AppError(
          "AUTH_FORBIDDEN",
          "Instituição não autorizada a consultar este saldo.",
        ),
      );
    }

    return withSimulatedNetwork(() => {
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

    const snapshot = buildTransparencySnapshot(input.campaignId);

    if (input.amountCents > snapshot.metrics.availableCents) {
      return err(
        new AppError(
          "INSUFFICIENT_FUNDS",
          "Saldo on-chain insuficiente para este saque.",
        ),
      );
    }

    if (input.amountCents <= 0) {
      return err(
        new AppError("INVALID_AMOUNT", "O valor do saque deve ser maior que zero."),
      );
    }

    return withSimulatedNetwork(() => {
      const occurredAt = new Date().toISOString();
      const movement: Movement = {
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

      appendOutflow(movement);

      return {
        ...movement,
        explorerUrl: movement.txSignature
          ? getExplorerTxUrl(movement.txSignature)
          : undefined,
      };
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

    const snapshot = buildTransparencySnapshot(input.campaignId);

    if (input.amountCents > snapshot.metrics.availableCents) {
      return err(
        new AppError(
          "INSUFFICIENT_FUNDS",
          "Saldo on-chain insuficiente para pagar este fornecedor.",
        ),
      );
    }

    return withSimulatedNetwork(() => {
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

      const movement: Movement = {
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

      appendOutflow(movement);

      return {
        ...movement,
        explorerUrl: getExplorerTxUrl(movement.txSignature ?? ""),
      };
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

    return withSimulatedNetwork(() => {
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
