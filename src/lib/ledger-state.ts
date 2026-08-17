import type { Donation, InvoiceEvidence, Movement } from "@/domain/types";

export type LedgerState = {
  donations: Donation[];
  outflows: Movement[];
  invoicePatches: Record<string, InvoiceEvidence>;
};

export function emptyLedgerState(): LedgerState {
  return {
    donations: [],
    outflows: [],
    invoicePatches: {},
  };
}
