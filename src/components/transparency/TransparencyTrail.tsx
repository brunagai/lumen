"use client";

import { useState } from "react";

import {
  solanaAdapter,
  type MovementRecord,
  type TransparencySnapshot,
} from "@/adapters/solana";
import { MacroMetrics } from "@/components/transparency/MacroMetrics";
import { MovementTimeline } from "@/components/transparency/MovementTimeline";
import { Button } from "@/components/ui/Button";
import { ErrorPanel, LoadingPanel } from "@/components/ui/StatusPanel";
import { CAMPAIGN } from "@/config/campaign";
import { useAsyncResult } from "@/hooks/use-async-result";
import { DEFAULT_LEDGER_PAGE_SIZE, type LedgerPage } from "@/lib/pagination";

export function TransparencyTrail() {
  const { state, retry } = useAsyncResult<TransparencySnapshot>(() =>
    solanaAdapter.getTransparencySnapshot(CAMPAIGN.id, {
      page: 1,
      pageSize: DEFAULT_LEDGER_PAGE_SIZE,
    }),
  );
  const [extraMovements, setExtraMovements] = useState<MovementRecord[]>([]);
  const [loadedPage, setLoadedPage] = useState<LedgerPage | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const page = loadedPage ?? (state.status === "success" ? state.data.page : null);
  const movements =
    state.status === "success"
      ? [...state.data.movements, ...extraMovements]
      : [];

  async function loadMore() {
    if (!page?.hasMore || loadingMore) {
      return;
    }

    setLoadingMore(true);
    const result = await solanaAdapter.getTransparencySnapshot(CAMPAIGN.id, {
      page: page.page + 1,
      pageSize: DEFAULT_LEDGER_PAGE_SIZE,
    });
    setLoadingMore(false);

    if (!result.ok) {
      return;
    }

    setExtraMovements((current) => [...current, ...result.value.movements]);
    setLoadedPage(result.value.page);
  }

  function handleRetry() {
    setExtraMovements([]);
    setLoadedPage(null);
    void retry();
  }

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
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
          onRetry={handleRetry}
        />
      ) : null}

      {state.status === "success" ? (
        <>
          <MacroMetrics metrics={state.data.metrics} />
          <MovementTimeline movements={movements} />
          {page?.hasMore ? (
            <div className="flex flex-col items-start gap-2">
              <p className="text-sm text-muted">
                Mostrando {movements.length} de {page.total} movimentações.
              </p>
              <Button
                variant="secondary"
                loading={loadingMore}
                loadingLabel="Carregando mais..."
                onClick={() => void loadMore()}
              >
                Carregar mais movimentações
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
