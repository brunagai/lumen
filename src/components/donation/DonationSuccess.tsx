import Link from "next/link";

import type { DonationReceipt } from "@/adapters/solana";
import { formatBrlFromCents } from "@/lib/money";

type DonationSuccessProps = {
  receipt: DonationReceipt;
};

export function DonationSuccess({ receipt }: DonationSuccessProps) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
      <p className="text-sm font-medium uppercase tracking-widest text-gold">
        Doação confirmada
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-teal">
        Muito Obrigado!
      </h1>
      <p className="mx-auto mt-3 max-w-lg text-muted">
        Sua doação de {formatBrlFromCents(receipt.donation.amount.amountCents)}{" "}
        foi registrada na Solana de forma imutável.
      </p>
      <div className="mt-8 flex justify-center">
        <Link
          href="/transparencia"
          className="inline-flex items-center justify-center rounded-lg bg-teal px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-teal/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        >
          Acompanhar destino do dinheiro
        </Link>
      </div>
    </section>
  );
}
