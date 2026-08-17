"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { formatBrlFromCents, parseBrlAmount } from "@/lib/money";

type WithdrawFormProps = {
  availableCents: number;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (amountCents: number) => Promise<boolean>;
};

export function WithdrawForm({
  availableCents,
  submitting,
  errorMessage,
  onSubmit,
}: WithdrawFormProps) {
  const [amount, setAmount] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLocalError(null);
    const parsed = parseBrlAmount(amount);

    if (!parsed.ok) {
      setLocalError(parsed.error.message);
      return;
    }

    const succeeded = await onSubmit(Math.round(parsed.value * 100));

    if (succeeded) {
      setAmount("");
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-teal">Saque para conta PJ</h2>
        <p className="mt-1 text-sm text-muted">
          A retirada gera uma saída pendente até o envio da nota fiscal, o que
          reduz o score de transparência.
        </p>
      </div>
      <Field label="Valor em reais">
        <TextInput
          inputMode="decimal"
          placeholder="Ex: 500"
          value={amount}
          disabled={submitting || availableCents <= 0}
          onChange={(event) => setAmount(event.target.value)}
        />
      </Field>
      <p className="text-xs text-muted">
        Disponível: {formatBrlFromCents(availableCents)}
      </p>
      {localError || errorMessage ? (
        <p className="text-sm text-red-800" role="alert">
          {localError ?? errorMessage}
        </p>
      ) : null}
      <Button
        type="submit"
        loading={submitting}
        disabled={availableCents <= 0}
      >
        Solicitar saque
      </Button>
    </form>
  );
}
