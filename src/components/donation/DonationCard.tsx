"use client";

import { useCallback, useState } from "react";

import type { Session } from "@/adapters/auth";
import { solanaAdapter, type DonationReceipt } from "@/adapters/solana";
import { AuthModal } from "@/components/auth/AuthModal";
import { CampaignProgress } from "@/components/campaign/CampaignProgress";
import { AmountSelector } from "@/components/donation/AmountSelector";
import { DonationSuccess } from "@/components/donation/DonationSuccess";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { CAMPAIGN } from "@/config/campaign";
import type { AsyncState } from "@/lib/async-state";
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

  const isDonating = donateState.status === "loading";

  const runDonation = useCallback(
    async (donorId: string, amount: QuickDonationBrl) => {
      setDonateState({ status: "loading" });

      const result = await solanaAdapter.confirmDonation({
        campaignId: CAMPAIGN.id,
        donorId,
        amountCents: brlToCents(amount),
      });

      if (result.ok) {
        setDonateState({ status: "success", data: result.value });
        return;
      }

      setDonateState({ status: "error", error: result.error });
    },
    [],
  );

  function handleEnterToDonate() {
    if (!selectedAmount) {
      return;
    }

    if (!session) {
      setIsAuthOpen(true);
      return;
    }

    void runDonation(session.userId, selectedAmount);
  }

  function handleAuthenticated(nextSession: Session) {
    setIsAuthOpen(false);

    if (!selectedAmount) {
      return;
    }

    void runDonation(nextSession.userId, selectedAmount);
  }

  if (donateState.status === "success") {
    return <DonationSuccess receipt={donateState.data} />;
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">
          {CAMPAIGN.title}
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Doe com rastreio on-chain. O valor escolhido é registrado de forma
          imutável na Solana Devnet após a entrada.
        </p>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-teal-soft p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-teal">
              Arrecadado
            </dt>
            <dd className="mt-1 text-xl font-semibold text-teal">
              {formatBrlFromCents(CAMPAIGN.raised.amountCents)}
            </dd>
          </div>
          <div className="rounded-xl bg-background p-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
              Meta
            </dt>
            <dd className="mt-1 text-xl font-semibold text-foreground">
              {formatBrlFromCents(CAMPAIGN.goal.amountCents)}
            </dd>
          </div>
        </dl>

        <div className="mt-6">
          <CampaignProgress
            raisedCents={CAMPAIGN.raised.amountCents}
            goalCents={CAMPAIGN.goal.amountCents}
          />
        </div>

        <div className="mt-8">
          <AmountSelector
            selected={selectedAmount}
            disabled={isDonating}
            onSelect={setSelectedAmount}
          />
        </div>

        {donateState.status === "error" ? (
          <p className="mt-4 text-sm text-red-800" role="alert">
            {donateState.error.message}
          </p>
        ) : null}

        <div className="mt-6">
          <Button
            onClick={handleEnterToDonate}
            disabled={!selectedAmount}
            loading={isDonating}
            loadingLabel="Registrando na Solana..."
          >
            Entrar para Doar
          </Button>
        </div>
      </div>

      <AuthModal
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthenticated={handleAuthenticated}
      />
    </section>
  );
}
