import type { TransparencyMetrics } from "@/adapters/solana";
import { formatBrlFromCents } from "@/lib/money";

type MacroMetricsProps = {
  metrics: TransparencyMetrics;
};

const CARDS = [
  {
    key: "raisedCents",
    label: "Total Arrecadado",
    hint: "Entradas confirmadas na Solana",
    tone: "raised",
  },
  {
    key: "usedCents",
    label: "Total Utilizado",
    hint: "Saídas para fornecedores",
    tone: "used",
  },
  {
    key: "availableCents",
    label: "Disponível On-Chain",
    hint: "Saldo ainda em carteira",
    tone: "available",
  },
] as const;

export function MacroMetrics({ metrics }: MacroMetricsProps) {
  return (
    <section aria-label="Métricas da campanha">
      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((card) => {
          const value = metrics[card.key];
          const cardClass =
            card.tone === "available"
              ? "bg-teal-soft"
              : card.tone === "used"
                ? "bg-background"
                : "bg-surface";

          return (
            <article
              key={card.key}
              className={`rounded-2xl border border-border p-5 ${cardClass}`}
            >
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {card.label}
              </h2>
              <p className="mt-2 text-2xl font-semibold break-words tabular-nums text-foreground">
                {formatBrlFromCents(value)}
              </p>
              <p className="mt-1 text-sm text-muted">{card.hint}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
