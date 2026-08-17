"use client";

import { useCallback, useEffect, useState } from "react";

import {
  solanaAdapter,
  type TransparencySnapshot,
} from "@/adapters/solana";
import { MacroMetrics } from "@/components/transparency/MacroMetrics";
import { MovementTimeline } from "@/components/transparency/MovementTimeline";
import { Button } from "@/components/ui/Button";
import { CAMPAIGN } from "@/config/campaign";
import type { AsyncState } from "@/lib/async-state";

export function TransparencyTrail() {
  const [state, setState] = useState<AsyncState<TransparencySnapshot>>({
    status: "loading",
  });

  const applySnapshot = useCallback(async () => {
    const result = await solanaAdapter.getTransparencySnapshot(CAMPAIGN.id);

    if (result.ok) {
      setState({ status: "success", data: result.value });
      return;
    }

    setState({ status: "error", error: result.error });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await solanaAdapter.getTransparencySnapshot(CAMPAIGN.id);

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

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-teal">
          Trilha de Transparência
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Acompanhe o ciclo completo do {CAMPAIGN.title}: cada entrada
          confirmada na Solana e cada saída com comprovante verificável.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <li className="rounded-full bg-inflow-bg px-3 py-1 text-inflow">
            Entrada on-chain
          </li>
          <li className="rounded-full bg-closed-bg px-3 py-1 text-closed">
            Cadeia fechada
          </li>
          <li className="rounded-full bg-pending-bg px-3 py-1 text-pending">
            Pendente
          </li>
        </ul>
      </header>

      {state.status === "loading" ? (
        <p className="rounded-2xl border border-border bg-surface p-6 text-muted">
          Carregando movimentações on-chain...
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
          <MacroMetrics metrics={state.data.metrics} />
          <MovementTimeline movements={state.data.movements} />
        </>
      ) : null}
    </div>
  );
}
