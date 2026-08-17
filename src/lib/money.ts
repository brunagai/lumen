import { AppError } from "@/lib/errors";
import { err, ok, type Result } from "@/lib/result";

export const QUICK_DONATION_BRL = [10, 50, 100] as const;

export type QuickDonationBrl = (typeof QUICK_DONATION_BRL)[number];

export function isAllowedQuickDonationBrl(
  value: number,
): value is QuickDonationBrl {
  return (QUICK_DONATION_BRL as readonly number[]).includes(value);
}

export function parseBrlAmount(input: string): Result<number> {
  const normalized = input.trim().replace(",", ".");

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return err(
      new AppError("INVALID_AMOUNT", "Informe um valor em reais válido."),
    );
  }

  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return err(
      new AppError("INVALID_AMOUNT", "O valor da doação deve ser maior que zero."),
    );
  }

  return ok(value);
}

export function brlToCents(brl: number): number {
  return Math.round(brl * 100);
}

export function formatBrlFromCents(amountCents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

export function formatUsdc(amount: number): string {
  return `${new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)} USDC`;
}
