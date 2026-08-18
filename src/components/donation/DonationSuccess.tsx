import Link from "next/link";

import type { DonationReceipt } from "@/adapters/solana";
import { formatBrlFromCents } from "@/lib/money";

type DonationSuccessProps = {
  receipt: DonationReceipt;
};

export function DonationSuccess({ receipt }: DonationSuccessProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 text-center shadow-sm sm:p-8">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">
        Doação confirmada
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
        Muito Obrigado!
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-muted">
        Sua doação de {formatBrlFromCents(receipt.donation.amount.amountCents)}{" "}
        foi registrada na Solana de forma imutável.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/transparencia"
          className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:w-auto"
        >
          Acompanhar destino do dinheiro
        </Link>
      </div>
    </section>
  );
}
