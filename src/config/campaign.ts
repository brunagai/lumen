import type { Campaign, Institution } from "@/domain/types";

export const INSTITUTION: Institution = {
  id: "casa-da-mulher",
  name: "Casa da Mulher",
  cnpj: "00.000.000/0001-00",
  verified: true,
};

export const CAMPAIGN: Campaign = {
  id: "fundo-amparo-casa-da-mulher",
  title: "Fundo de Amparo: Casa da Mulher",
  institutionId: INSTITUTION.id,
  institutionName: INSTITUTION.name,
  goal: { amountCents: 5_000_000, currency: "BRL" },
  raised: { amountCents: 1_845_000, currency: "BRL" },
};
