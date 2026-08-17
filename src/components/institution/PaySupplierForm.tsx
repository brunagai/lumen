"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field, SelectInput, TextInput } from "@/components/ui/Field";
import { APPROVED_SUPPLIERS } from "@/config/institution";
import { formatBrlFromCents, parseBrlAmount } from "@/lib/money";

type PaySupplierFormProps = {
  availableCents: number;
  submitting: boolean;
  errorMessage?: string;
  onSubmit: (input: {
    supplierName: string;
    description: string;
    invoiceNumber: string;
    amountCents: number;
  }) => Promise<boolean>;
};

export function PaySupplierForm({
  availableCents,
  submitting,
  errorMessage,
  onSubmit,
}: PaySupplierFormProps) {
  const [supplierName, setSupplierName] = useState<string>(
    APPROVED_SUPPLIERS[0],
  );
  const [description, setDescription] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
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

    const succeeded = await onSubmit({
      supplierName,
      description,
      invoiceNumber,
      amountCents: Math.round(parsed.value * 100),
    });

    if (succeeded) {
      setDescription("");
      setInvoiceNumber("");
      setAmount("");
    }
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6"
    >
      <div>
        <h2 className="text-lg font-semibold text-teal">Pagar fornecedor</h2>
        <p className="mt-1 text-sm text-muted">
          Libera fundos para um fornecedor homologado e já vincula a nota
          fiscal, fechando a cadeia na trilha pública.
        </p>
      </div>
      <Field label="Fornecedor homologado">
        <SelectInput
          value={supplierName}
          disabled={submitting}
          onChange={(event) => setSupplierName(event.target.value)}
        >
          {APPROVED_SUPPLIERS.map((supplier) => (
            <option key={supplier} value={supplier}>
              {supplier}
            </option>
          ))}
        </SelectInput>
      </Field>
      <Field label="Descrição da despesa">
        <TextInput
          value={description}
          disabled={submitting}
          placeholder="Ex: Compra de kits de higiene"
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="Número da nota fiscal">
        <TextInput
          value={invoiceNumber}
          disabled={submitting}
          placeholder="Ex: NF 2026/0401"
          onChange={(event) => setInvoiceNumber(event.target.value)}
        />
      </Field>
      <Field label="Valor em reais">
        <TextInput
          inputMode="decimal"
          placeholder="Ex: 250"
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
      <Button type="submit" loading={submitting} disabled={availableCents <= 0}>
        Registrar pagamento
      </Button>
    </form>
  );
}
