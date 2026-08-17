import type { MovementRecord } from "@/adapters/solana";
import { MovementItem } from "@/components/transparency/MovementItem";

type MovementTimelineProps = {
  movements: MovementRecord[];
};

export function MovementTimeline({ movements }: MovementTimelineProps) {
  if (movements.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-surface p-6 text-muted">
        Ainda não há movimentações registradas nesta campanha.
      </p>
    );
  }

  return (
    <section aria-label="Linha do tempo das movimentações" className="relative">
      <span
        aria-hidden="true"
        className="absolute top-3 bottom-3 left-[5px] w-px bg-border"
      />
      <ol className="flex flex-col gap-5">
        {movements.map((movement) => (
          <li key={movement.id}>
            <MovementItem movement={movement} />
          </li>
        ))}
      </ol>
    </section>
  );
}
