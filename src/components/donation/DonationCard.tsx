"use client";

import { useCallback, useEffect, useState } from "react";

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
import type { AsyncState } from "@/lib/async-state";
import { toAppError } from "@/lib/errors";
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
  const [donateState, setDonateState] = useState<AsyncState<DonationReceipt>>({
    status: "idle",
  });
  const [snapshotState, setSnapshotState] = useState<
    AsyncState<TransparencySnapshot>
  >({
    status: "loading",
  });

  const isDonating = donateState.status === "loading";

  const applySnapshot = useCallback(async () => {
    try {
      const result = await solanaAdapter.getTransparencySnapshot(CAMPAIGN.id);

      if (result.ok) {
        setSnapshotState({ status: "success", data: result.value });
        return;
      }

      setSnapshotState({ status: "error", error: result.error });
    } catch (cause) {
      setSnapshotState({ status: "error", error: toAppError(cause) });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const result = await solanaAdapter.getTransparencySnapshot(CAMPAIGN.id);

        if (cancelled) {
          return;
        }

        if (result.ok) {
          setSnapshotState({ status: "success", data: result.value });
          return;
        }

        setSnapshotState({ status: "error", error: result.error });
      } catch (cause) {
        if (!cancelled) {
          setSnapshotState({ status: "error", error: toAppError(cause) });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const runDonation = useCallback(
    async (donorSession: Session, amount: QuickDonationBrl) => {
      setDonateState({ status: "loading" });

      try {
        const result = await solanaAdapter.confirmDonation({
          campaignId: CAMPAIGN.id,
          amountCents: brlToCents(amount),
          session: donorSession,
        });

        if (result.ok) {
          await applySnapshot();
          setDonateState({ status: "success", data: result.value });
          return;
        }

        setDonateState({ status: "error", error: result.error });
      } catch (cause) {
        setDonateState({ status: "error", error: toAppError(cause) });
      }
    },
    [applySnapshot],
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

  async function handleRetrySnapshot() {
    setSnapshotState({ status: "loading" });
    await applySnapshot();
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-teal sm:text-3xl">
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
                void handleRetrySnapshot();
              }}
            />
          </div>
        ) : null}

        {snapshotState.status === "success" ? (
          <>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-teal-soft p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-teal">
                  Arrecadado
                </dt>
                <dd className="mt-1 text-xl font-semibold break-words text-teal">
                  {formatBrlFromCents(snapshotState.data.metrics.raisedCents)}
                </dd>
              </div>
              <div className="rounded-xl bg-background p-4">
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
