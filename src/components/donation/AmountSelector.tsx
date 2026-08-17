"use client";

import {
  QUICK_DONATION_BRL,
  formatBrlFromCents,
  type QuickDonationBrl,
} from "@/lib/money";

type AmountSelectorProps = {
  selected: QuickDonationBrl | null;
  disabled?: boolean;
  onSelect: (amount: QuickDonationBrl) => void;
};

export function AmountSelector({
  selected,
  disabled = false,
  onSelect,
}: AmountSelectorProps) {
  return (
    <fieldset disabled={disabled} className="border-0 p-0">
      <legend className="mb-3 text-sm font-semibold text-foreground">
        Escolha um valor
      </legend>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {QUICK_DONATION_BRL.map((amount) => {
          const isSelected = selected === amount;

          return (
            <button
              key={amount}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onSelect(amount)}
              className={`min-h-11 rounded-xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal disabled:cursor-not-allowed disabled:opacity-60 sm:px-3 sm:text-sm ${
                isSelected
                  ? "border-teal bg-teal text-white"
                  : "border-border bg-surface text-teal hover:bg-teal-soft"
              }`}
            >
              {formatBrlFromCents(amount * 100)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
