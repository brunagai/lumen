"use client";

import { useCallback, useState } from "react";

import type { Session } from "@/adapters/auth";
import {
  solanaAdapter,
  type DonationReceipt,
  type TransparencySnapshot,
} from "@/adapters/solana";
import { AuthModal } from "@/components/auth/AuthModal";
import { CampaignProgress } from "@/components/campaign/CampaignProgress";
import { AmountSelector } from "@/components/donation/AmountSelector";
import { DonationSuccess } from "@/components/donation/DonationSuccess";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { ErrorPanel, LoadingPanel } from "@/components/ui/StatusPanel";
import { CAMPAIGN } from "@/config/campaign";
import { useAsyncAction, useAsyncResult } from "@/hooks/use-async-result";
import {
  brlToCents,
  formatBrlFromCents,
  type QuickDonationBrl,
} from "@/lib/money";

export function DonationCard() {
  const { session } = useAuth();
  const [selectedAmount, setSelectedAmount] = useState<QuickDonationBrl | null>(
    null,
  );
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const {
    state: snapshotState,
    reload: reloadSnapshot,
    retry: retrySnapshot,
  } = useAsyncResult<TransparencySnapshot>(() =>
    solanaAdapter.getTransparencySnapshot(CAMPAIGN.id),
  );
  const { state: donateState, run: runDonate } =
    useAsyncAction<DonationReceipt>();

  const isDonating = donateState.status === "loading";

  const runDonation = useCallback(
    async (donorSession: Session, amount: QuickDonationBrl) => {
      await runDonate(async () => {
        const result = await solanaAdapter.confirmDonation({
          campaignId: CAMPAIGN.id,
          amountCents: brlToCents(amount),
          session: donorSession,
        });

        if (result.ok) {
          await reloadSnapshot({ silent: true });
        }

        return result;
      });
    },
    [reloadSnapshot, runDonate],
  );

  function handleEnterToDonate() {
    if (!selectedAmount) {
      return;
    }

    if (!session) {
      setIsAuthOpen(true);
      return;
    }

    void runDonation(session, selectedAmount);
  }

  function handleAuthenticated(nextSession: Session) {
    setIsAuthOpen(false);

    if (!selectedAmount) {
      return;
    }

    void runDonation(nextSession, selectedAmount);
  }

  function handleRetry() {
    if (!session || !selectedAmount) {
      return;
    }

    void runDonation(session, selectedAmount);
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          {CAMPAIGN.title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Doe com rastreio on-chain. O valor escolhido é registrado de forma
          imutável na Solana Devnet após a entrada.
        </p>

        {snapshotState.status === "loading" ? (
          <div className="mt-8">
            <LoadingPanel message="Carregando arrecadação da campanha..." />
          </div>
        ) : null}

        {snapshotState.status === "error" ? (
          <div className="mt-8">
            <ErrorPanel
              message={snapshotState.error.message}
              onRetry={() => {
                void retrySnapshot();
              }}
            />
          </div>
        ) : null}

        {snapshotState.status === "success" ? (
          <>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-accent-soft p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Arrecadado
                </dt>
                <dd className="mt-1 text-xl font-semibold break-words text-primary">
                  {formatBrlFromCents(snapshotState.data.metrics.raisedCents)}
                </dd>
              </div>
              <div className="rounded-xl bg-base p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Meta
                </dt>
                <dd className="mt-1 text-xl font-semibold break-words text-foreground">
                  {formatBrlFromCents(CAMPAIGN.goal.amountCents)}
                </dd>
              </div>
            </dl>

            <div className="mt-6">
              <CampaignProgress
                raisedCents={snapshotState.data.metrics.raisedCents}
                goalCents={CAMPAIGN.goal.amountCents}
              />
            </div>
          </>
        ) : null}

        {donateState.status === "success" ? (
          <div className="mt-8">
            <DonationSuccess receipt={donateState.data} />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <AmountSelector
                selected={selectedAmount}
                disabled={isDonating}
                onSelect={setSelectedAmount}
              />
            </div>

            {!selectedAmount ? (
              <p className="mt-3 text-sm text-muted">
                Selecione um valor para continuar.
              </p>
            ) : null}

            {donateState.status === "error" ? (
              <div className="mt-4">
                <ErrorPanel
                  message={donateState.error.message}
                  onRetry={session ? handleRetry : undefined}
                />
              </div>
            ) : null}

            <div className="mt-6">
              <Button
                className="w-full sm:w-auto"
                onClick={handleEnterToDonate}
                disabled={!selectedAmount}
                loading={isDonating}
                loadingLabel="Registrando na Solana..."
              >
                Entrar para Doar
              </Button>
            </div>
          </>
        )}
      </div>

      <AuthModal
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </section>
  );
}
