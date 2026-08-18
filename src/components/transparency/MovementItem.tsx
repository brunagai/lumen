import type { MovementRecord } from "@/adapters/solana";
import { InvoiceEvidenceCard } from "@/components/transparency/InvoiceEvidenceCard";
import { MovementStatusBadge } from "@/components/transparency/MovementStatusBadge";
import { formatDateTimePtBr, shortenSignature } from "@/lib/format";
import { formatBrlFromCents } from "@/lib/money";
import { parseSafeHttpUrl } from "@/lib/safe-url";

type MovementItemProps = {
  movement: MovementRecord;
};

export function MovementItem({ movement }: MovementItemProps) {
  const isInflow = movement.kind === "inflow";
  const amountPrefix = isInflow ? "+" : "−";
  const amountClass = isInflow ? "text-inflow" : "text-outflow";
  const explorerHref = movement.explorerUrl
    ? parseSafeHttpUrl(movement.explorerUrl)
    : null;

  return (
    <article className="relative pl-7 sm:pl-8">
      <span
        aria-hidden="true"
        className={`absolute top-2 left-0 h-3 w-3 rounded-full ${
          movement.status === "pending"
            ? "bg-pending"
            : movement.status === "chain_closed"
              ? "bg-closed"
              : "bg-inflow"
        }`}
      />
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {isInflow ? "Entrada" : "Saída"}
            </p>
            <h3 className="mt-1 text-base font-semibold break-words text-foreground">
              {movement.description}
            </h3>
            {movement.supplierName ? (
              <p className="mt-1 text-sm break-words text-muted">
                Fornecedor: {movement.supplierName}
              </p>
            ) : null}
          </div>
          <div className="sm:text-right">
            <p className={`text-lg font-semibold tabular-nums ${amountClass}`}>
              {amountPrefix}
              {formatBrlFromCents(movement.amount.amountCents)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatDateTimePtBr(movement.occurredAt)}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <MovementStatusBadge status={movement.status} />
          {movement.txSignature && explorerHref?.ok ? (
            <a
              href={explorerHref.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium break-all text-primary underline-offset-2 hover:underline"
            >
              Tx {shortenSignature(movement.txSignature)} na Devnet
            </a>
          ) : null}
        </div>

        {!isInflow ? (
          <div className="mt-4">
            <InvoiceEvidenceCard invoice={movement.invoice} />
          </div>
        ) : null}
      </div>
    </article>
  );
}
