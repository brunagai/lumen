"use client";

import { useCallback, useEffect, useState } from "react";

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
import { CAMPAIGN, INSTITUTION } from "@/config/campaign";
import type { AsyncState } from "@/lib/async-state";

export function InstitutionDashboard() {
  const { signOut } = useAuth();
  const [state, setState] = useState<
    AsyncState<InstitutionDashboardSnapshot>
  >({
    status: "loading",
  });
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [attachSubmittingId, setAttachSubmittingId] = useState<string | null>(
    null,
  );
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [attachError, setAttachError] = useState<string | null>(null);

  const applySnapshot = useCallback(async () => {
    const result = await solanaAdapter.getInstitutionDashboard(INSTITUTION.id);

    if (result.ok) {
      setState({ status: "success", data: result.value });
      return;
    }

    setState({ status: "error", error: result.error });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await solanaAdapter.getInstitutionDashboard(INSTITUTION.id);

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setState({ status: "success", data: result.value });
        return;
      }

      setState({ status: "error", error: result.error });
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRetry() {
    setState({ status: "loading" });
    await applySnapshot();
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  async function handleWithdraw(amountCents: number) {
    setWithdrawError(null);
    setWithdrawSubmitting(true);
    const result = await solanaAdapter.requestPjWithdrawal({
      campaignId: CAMPAIGN.id,
      amountCents,
    });
    setWithdrawSubmitting(false);

    if (!result.ok) {
      setWithdrawError(result.error.message);
      return false;
    }

    await applySnapshot();
    return true;
  }

  async function handlePaySupplier(input: {
    supplierName: string;
    description: string;
    invoiceNumber: string;
    amountCents: number;
  }) {
    setPayError(null);
    setPaySubmitting(true);
    const result = await solanaAdapter.paySupplier({
      campaignId: CAMPAIGN.id,
      ...input,
    });
    setPaySubmitting(false);

    if (!result.ok) {
      setPayError(result.error.message);
      return false;
    }

    await applySnapshot();
    return true;
  }

  async function handleAttach(input: {
    movementId: string;
    invoiceNumber: string;
    issuer: string;
  }) {
    setAttachError(null);
    setAttachSubmittingId(input.movementId);
    const result = await solanaAdapter.attachInvoice(input);
    setAttachSubmittingId(null);

    if (!result.ok) {
      setAttachError(result.error.message);
      return false;
    }

    await applySnapshot();
    return true;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-teal">
            {INSTITUTION.name} — CNPJ verificado
          </h1>
          <p className="mt-1 text-sm text-muted">CNPJ {INSTITUTION.cnpj}</p>
        </div>
        <Button
          variant="secondary"
          loading={isSigningOut}
          onClick={() => void handleSignOut()}
        >
          Encerrar sessão
        </Button>
      </header>

      {state.status === "loading" ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-muted">
          Carregando saldo on-chain...
        </p>
      ) : null}

      {state.status === "error" ? (
        <div className="rounded-2xl border border-border bg-surface p-6">
          <p className="text-sm text-red-800" role="alert">
            {state.error.message}
          </p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => void handleRetry()}>
              Tentar novamente
            </Button>
          </div>
        </div>
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
