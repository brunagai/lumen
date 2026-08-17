import type { OnChainBalance, SolanaCluster } from "@/adapters/solana";
import { formatBrlFromCents, formatUsdc } from "@/lib/money";

type OnChainBalanceCardProps = {
  balance: OnChainBalance;
  cluster: SolanaCluster;
};

export function OnChainBalanceCard({
  balance,
  cluster,
}: OnChainBalanceCardProps) {
  const clusterLabel = cluster === "devnet" ? "Solana Devnet" : cluster;

  return (
    <article className="rounded-2xl border border-border bg-teal-soft p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-teal">
        Saldo disponível on-chain
      </h2>
      <p className="mt-2 text-3xl font-semibold tabular-nums text-teal">
        {formatBrlFromCents(balance.availableBrlCents)}
      </p>
      <p className="mt-2 text-sm text-muted">
        {formatUsdc(balance.availableUsdc)} · conversão simulada
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-teal">
        {clusterLabel}
      </p>
    </article>
  );
}
