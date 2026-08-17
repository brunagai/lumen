import { INSTITUTION } from "@/config/campaign";

export const APPROVED_SUPPLIERS = [
  "Distribuidora Alimentos Vida Ltda",
  "Farmácia Popular Solidária",
  "Transportadora Norte Seguro",
  "Papelaria e Expediente União",
] as const;

export type ApprovedSupplier = (typeof APPROVED_SUPPLIERS)[number];

export const PJ_ACCOUNT_LABEL = `Conta PJ — ${INSTITUTION.name}`;

export const SCORE_PENALTY_PER_PENDING = 8;
export const MOCK_USDC_RATE = 5.6;
