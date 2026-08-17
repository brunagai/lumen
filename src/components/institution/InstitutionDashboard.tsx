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
import { ErrorPanel, LoadingPanel } from "@/components/ui/StatusPanel";
import { CAMPAIGN, INSTITUTION } from "@/config/campaign";
import type { AsyncState } from "@/lib/async-state";
import { toAppError } from "@/lib/errors";

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
    try {
      const result = await solanaAdapter.getInstitutionDashboard(INSTITUTION.id);

      if (result.ok) {
        setState({ status: "success", data: result.value });
        return;
      }

      setState({ status: "error", error: result.error });
    } catch (cause) {
      setState({ status: "error", error: toAppError(cause) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await solanaAdapter.getInstitutionDashboard(INSTITUTION.id);

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setState({ status: "success", data: result.value });
          return;
        }

        setState({ status: "error", error: result.error });
      } catch (cause) {
        if (!cancelled) {
          setState({ status: "error", error: toAppError(cause) });
        }
      }
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

    try {
      const result = await solanaAdapter.requestPjWithdrawal({
        campaignId: CAMPAIGN.id,
        amountCents,
      });

      if (!result.ok) {
        setWithdrawError(result.error.message);
        return false;
      }

      await applySnapshot();
      return true;
    } catch (cause) {
      setWithdrawError(toAppError(cause).message);
      return false;
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
    setPayError(null);
    setPaySubmitting(true);

    try {
      const result = await solanaAdapter.paySupplier({
        campaignId: CAMPAIGN.id,
        ...input,
      });

      if (!result.ok) {
        setPayError(result.error.message);
        return false;
      }

      await applySnapshot();
      return true;
    } catch (cause) {
      setPayError(toAppError(cause).message);
      return false;
    } finally {
      setPaySubmitting(false);
    }
  }

  async function handleAttach(input: {
    movementId: string;
    invoiceNumber: string;
    issuer: string;
  }) {
    setAttachError(null);
    setAttachSubmittingId(input.movementId);

    try {
      const result = await solanaAdapter.attachInvoice(input);

      if (!result.ok) {
        setAttachError(result.error.message);
        return false;
      }

      await applySnapshot();
      return true;
    } catch (cause) {
      setAttachError(toAppError(cause).message);
      return false;
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
          onRetry={() => void handleRetry()}
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
