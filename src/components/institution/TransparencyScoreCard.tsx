import type { TransparencyScore } from "@/adapters/solana";

type TransparencyScoreCardProps = {
  score: TransparencyScore;
};

function scoreTone(value: number): string {
  if (value >= 90) {
    return "text-closed";
  }

  if (value >= 80) {
    return "text-teal";
  }

  return "text-pending";
}

export function TransparencyScoreCard({ score }: TransparencyScoreCardProps) {
  const barClass =
    score.value >= 90
      ? "bg-closed"
      : score.value >= 80
        ? "bg-teal"
        : "bg-pending";

  return (
    <article className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
        Score de Transparência
      </h2>
      <p className={`mt-2 text-3xl font-semibold tabular-nums ${scoreTone(score.value)}`}>
        {score.value}/{score.max}
      </p>
      <div
        role="progressbar"
        aria-label="Score de transparência"
        aria-valuemin={0}
        aria-valuemax={score.max}
        aria-valuenow={score.value}
        className="mt-4 h-3 overflow-hidden rounded-full bg-background"
      >
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${score.value}%` }}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {score.pendingCount === 0
          ? "Nenhuma pendência de nota fiscal. Cadeia de evidência fechada."
          : `${score.pendingCount} pendência(s) de nota fiscal (−${score.penaltyPerPending} pontos cada).`}
      </p>
    </article>
  );
}
