"use client";

import { useState } from "react";

import { canAccessInstitutionPortal, type Session } from "@/adapters/auth";
import {
  solanaAdapter,
  type InstitutionDashboardSnapshot,
} from "@/adapters/solana";
import { AttachInvoicePanel } from "@/components/institution/AttachInvoicePanel";
import { OnChainBalanceCard } from "@/components/institution/OnChainBalanceCard";
import { PaySupplierForm } from "@/components/institution/PaySupplierForm";
import { TransparencyScoreCard } from "@/components/institution/TransparencyScoreCard";
import { WithdrawForm } from "@/components/institution/WithdrawForm";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { ErrorPanel, LoadingPanel } from "@/components/ui/StatusPanel";
import { CAMPAIGN, INSTITUTION } from "@/config/campaign";
import { useAsyncResult } from "@/hooks/use-async-result";
import { runResult } from "@/lib/async-state";
import type { Result } from "@/lib/result";

export function InstitutionDashboard() {
  const { session, signOut } = useAuth();
  const { state, reload, retry } = useAsyncResult<InstitutionDashboardSnapshot>(
    () => solanaAdapter.getInstitutionDashboard(INSTITUTION.id),
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [attachSubmittingId, setAttachSubmittingId] = useState<string | null>(
    null,
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  async function runAuthorizedMutation(
    setError: (message: string | null) => void,
    operation: (
      authorizedSession: Session & { role: "institution" },
    ) => Promise<Result<unknown>>,
  ): Promise<boolean> {
    setError(null);

    if (!canAccessInstitutionPortal(session)) {
      setError(
        "Apenas a instituição autenticada pode executar esta operação.",
      );
      return false;
    }

    const result = await runResult(() => operation(session));

    if (!result.ok) {
      setError(result.error.message);
      return false;
    }

    await reload({ silent: true });
    return true;
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  async function handleWithdraw(amountCents: number) {
    setWithdrawSubmitting(true);

    try {
      return await runAuthorizedMutation(setWithdrawError, (authorizedSession) =>
        solanaAdapter.requestPjWithdrawal({
          campaignId: CAMPAIGN.id,
          amountCents,
          session: authorizedSession,
        }),
      );
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  async function handlePaySupplier(input: {
    supplierName: string;
    description: string;
    invoiceNumber: string;
    amountCents: number;
  }) {
    setPaySubmitting(true);

    try {
      return await runAuthorizedMutation(setPayError, (authorizedSession) =>
        solanaAdapter.paySupplier({
          campaignId: CAMPAIGN.id,
          ...input,
          session: authorizedSession,
        }),
      );
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleAttach(input: {
    movementId: string;
    invoiceNumber: string;
    issuer: string;
  }) {
    setAttachSubmittingId(input.movementId);

    try {
      return await runAuthorizedMutation(setAttachError, (authorizedSession) =>
        solanaAdapter.attachInvoice({
          ...input,
          session: authorizedSession,
        }),
      );
    } finally {
      setAttachSubmittingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight break-words text-teal sm:text-3xl">
            {INSTITUTION.name} — CNPJ verificado
          </h1>
          <p className="mt-1 text-sm text-muted">CNPJ {INSTITUTION.cnpj}</p>
        </div>
        <Button
          variant="secondary"
          className="w-full sm:w-auto"
          loading={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          Encerrar sessão
        </Button>
      </header>

      {state.status === "loading" ? (
        <LoadingPanel message="Carregando saldo on-chain..." />
      ) : null}

      {state.status === "error" ? (
        <ErrorPanel
          message={state.error.message}
          onRetry={() => void retry()}
        />
      ) : null}

      {state.status === "success" ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <OnChainBalanceCard
              balance={state.data.balance}
              cluster={state.data.cluster}
            />
            <TransparencyScoreCard score={state.data.score} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <WithdrawForm
              availableCents={state.data.balance.availableBrlCents}
              submitting={withdrawSubmitting}
              errorMessage={withdrawError ?? undefined}
              onSubmit={handleWithdraw}
            />
            <PaySupplierForm
              availableCents={state.data.balance.availableBrlCents}
              submitting={paySubmitting}
              errorMessage={payError ?? undefined}
              onSubmit={handlePaySupplier}
            />
          </div>

          <AttachInvoicePanel
            pendingOutflows={state.data.pendingOutflows}
            submittingId={attachSubmittingId}
            errorMessage={attachError ?? undefined}
            onAttach={handleAttach}
          />
        </>
      ) : null}
    </div>
  );
}
