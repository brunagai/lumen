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
  raised: Money;
};

export type Donation = {
  id: string;
  campaignId: CampaignId;
  amount: Money;
  txSignature: string;
  confirmedAt: string;
};

export type MovementKind = "inflow" | "outflow";

export type Movement = {
  id: string;
  campaignId: CampaignId;
  kind: MovementKind;
  amount: Money;
  occurredAt: string;
  description: string;
  txSignature?: string;
  invoiceUrl?: string;
};

export type Institution = {
  id: InstitutionId;
  name: string;
  cnpj: string;
  verified: true;
};
