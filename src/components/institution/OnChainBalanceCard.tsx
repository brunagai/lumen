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
    <article className="rounded-2xl bg-secondary p-4 text-white sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-white/85">
        Saldo disponível on-chain
      </h2>
      <p className="mt-2 text-2xl font-semibold break-words tabular-nums text-white sm:text-3xl">
        {formatBrlFromCents(balance.availableBrlCents)}
      </p>
      <p className="mt-2 text-sm text-white/85">
        {formatUsdc(balance.availableUsdc)} · conversão simulada
      </p>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-accent">
        {clusterLabel}
      </p>
    </article>
  );
}
