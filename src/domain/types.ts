export type Currency = "BRL";

export type Money = {
  amountCents: number;
  currency: Currency;
};

export type CampaignId = string;
export type InstitutionId = string;

export type Campaign = {
  id: CampaignId;
  title: string;
  institutionId: InstitutionId;
  institutionName: string;
  goal: Money;
};

export type Donation = {
  id: string;
  campaignId: CampaignId;
  amount: Money;
  txSignature: string;
  confirmedAt: string;
};

export type MovementKind = "inflow" | "outflow";

export const MOVEMENT_STATUSES = [
  "on_chain_inflow",
  "chain_closed",
  "pending",
] as const;

export type MovementStatus = (typeof MOVEMENT_STATUSES)[number];

export type InvoiceEvidence = {
  number: string;
  issuer: string;
  issuedAt: string;
  documentUrl: string;
};

export type Movement = {
  id: string;
  campaignId: CampaignId;
  kind: MovementKind;
  status: MovementStatus;
  amount: Money;
  occurredAt: string;
  description: string;
  txSignature?: string;
  supplierName?: string;
  invoice?: InvoiceEvidence;
};

export type Institution = {
  id: InstitutionId;
  name: string;
  cnpj: string;
  verified: true;
};
