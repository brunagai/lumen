"use client";

import { useState } from "react";

import type { MovementRecord } from "@/adapters/solana";
import { Button } from "@/components/ui/Button";
import { Field, TextInput } from "@/components/ui/Field";
import { formatDateTimePtBr } from "@/lib/format";
import { formatBrlFromCents } from "@/lib/money";

type AttachInvoicePanelProps = {
  pendingOutflows: MovementRecord[];
  submittingId: string | null;
  errorMessage?: string;
  onAttach: (input: {
    movementId: string;
    invoiceNumber: string;
    issuer: string;
  }) => Promise<boolean>;
};

export function AttachInvoicePanel({
  pendingOutflows,
  submittingId,
  errorMessage,
  onAttach,
}: AttachInvoicePanelProps) {
  const [drafts, setDrafts] = useState<
    Record<string, { invoiceNumber: string; issuer: string }>
  >({});

  function draftFor(id: string) {
    return drafts[id] ?? { invoiceNumber: "", issuer: "" };
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="text-lg font-semibold text-teal">Anexar recibo / nota fiscal</h2>
      <p className="mt-1 text-sm text-muted">
        Feche as saídas pendentes para restaurar o score e atualizar a trilha
        pública.
      </p>

      {pendingOutflows.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Não há pendências. Todas as saídas estão com cadeia fechada.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {pendingOutflows.map((movement) => {
            const draft = draftFor(movement.id);
            const isSubmitting = submittingId === movement.id;

            return (
              <li
                key={movement.id}
                className="rounded-xl border border-pending/30 bg-pending-bg/40 p-4"
              >
                <p className="font-medium text-foreground">
                  {movement.description}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {movement.supplierName} ·{" "}
                  {formatBrlFromCents(movement.amount.amountCents)} ·{" "}
                  {formatDateTimePtBr(movement.occurredAt)}
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Número da NF">
                    <TextInput
                      value={draft.invoiceNumber}
                      disabled={isSubmitting}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [movement.id]: {
                            ...draftFor(movement.id),
                            invoiceNumber: event.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                  <Field label="Emitente">
                    <TextInput
                      value={draft.issuer}
                      disabled={isSubmitting}
                      placeholder={movement.supplierName}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [movement.id]: {
                            ...draftFor(movement.id),
                            issuer: event.target.value,
                          },
                        }))
                      }
                    />
                  </Field>
                </div>
                <div className="mt-3">
                  <Button
                    loading={isSubmitting}
                    onClick={() =>
                      void onAttach({
                        movementId: movement.id,
                        invoiceNumber: draft.invoiceNumber,
                        issuer: draft.issuer || movement.supplierName || "",
                      })
                    }
                  >
                    Anexar e fechar cadeia
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {errorMessage ? (
        <p className="mt-4 text-sm text-red-800" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </section>
  );
}
