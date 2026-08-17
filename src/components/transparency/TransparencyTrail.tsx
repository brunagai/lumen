"use client";

import {
  solanaAdapter,
  type TransparencySnapshot,
} from "@/adapters/solana";
import { MacroMetrics } from "@/components/transparency/MacroMetrics";
import { MovementTimeline } from "@/components/transparency/MovementTimeline";
import { ErrorPanel, LoadingPanel } from "@/components/ui/StatusPanel";
import { CAMPAIGN } from "@/config/campaign";
import { useAsyncResult } from "@/hooks/use-async-result";

export function TransparencyTrail() {
  const { state, retry } = useAsyncResult<TransparencySnapshot>(() =>
    solanaAdapter.getTransparencySnapshot(CAMPAIGN.id),
  );

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-teal sm:text-3xl">
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
        <LoadingPanel message="Carregando movimentações on-chain..." />
      ) : null}

      {state.status === "error" ? (
        <ErrorPanel
          message={state.error.message}
          onRetry={() => void retry()}
        />
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
