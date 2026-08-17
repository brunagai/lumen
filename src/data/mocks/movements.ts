import { CAMPAIGN } from "@/config/campaign";
import type { Movement } from "@/domain/types";

export const SEED_MOVEMENTS: Movement[] = [
  {
    id: "inflow-seed-1",
    campaignId: CAMPAIGN.id,
    kind: "inflow",
    status: "on_chain_inflow",
    amount: { amountCents: 1_000_000, currency: "BRL" },
    occurredAt: "2026-07-12T14:20:00.000Z",
    description: "Doação confirmada na Solana",
    txSignature:
      "5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ9aL3nR8cVwX1bH4sT7dE6fG0jK2p",
  },
  {
    id: "inflow-seed-2",
    campaignId: CAMPAIGN.id,
    kind: "inflow",
    status: "on_chain_inflow",
    amount: { amountCents: 500_000, currency: "BRL" },
    occurredAt: "2026-07-28T09:05:00.000Z",
    description: "Doação confirmada na Solana",
    txSignature:
      "3nR8cVwX1bH4sT7dE6fG0jK2pQ9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ9aL5uYk3mQp",
  },
  {
    id: "inflow-seed-3",
    campaignId: CAMPAIGN.id,
    kind: "inflow",
    status: "on_chain_inflow",
    amount: { amountCents: 245_000, currency: "BRL" },
    occurredAt: "2026-08-03T18:41:00.000Z",
    description: "Doação confirmada na Solana",
    txSignature:
      "9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ",
  },
  {
    id: "inflow-seed-4",
    campaignId: CAMPAIGN.id,
    kind: "inflow",
    status: "on_chain_inflow",
    amount: { amountCents: 100_000, currency: "BRL" },
    occurredAt: "2026-08-10T11:12:00.000Z",
    description: "Doação confirmada na Solana",
    txSignature:
      "2pQ9aL5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ9aL2nR8cVwX1bH4sT7dE6fG",
  },
  {
    id: "outflow-seed-1",
    campaignId: CAMPAIGN.id,
    kind: "outflow",
    status: "chain_closed",
    amount: { amountCents: 350_000, currency: "BRL" },
    occurredAt: "2026-08-05T16:30:00.000Z",
    description: "Compra de cestas básicas e itens de higiene",
    supplierName: "Distribuidora Alimentos Vida Ltda",
    txSignature:
      "7dE6fG0jK2pQ9aL2nR8cVwX1bH4sT5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2p",
    invoice: {
      number: "NF 2026/0148",
      issuer: "Distribuidora Alimentos Vida Ltda",
      issuedAt: "2026-08-05T15:00:00.000Z",
      documentUrl: "/comprovantes/nf-0148.html",
    },
  },
  {
    id: "outflow-seed-2",
    campaignId: CAMPAIGN.id,
    kind: "outflow",
    status: "chain_closed",
    amount: { amountCents: 180_000, currency: "BRL" },
    occurredAt: "2026-08-08T13:10:00.000Z",
    description: "Medicamentos e kit de primeiros socorros",
    supplierName: "Farmácia Popular Solidária",
    txSignature:
      "1bH4sT7dE6fG0jK2pQ9aL2nR8cVwX5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ",
    invoice: {
      number: "NF 2026/0321",
      issuer: "Farmácia Popular Solidária",
      issuedAt: "2026-08-08T12:40:00.000Z",
      documentUrl: "/comprovantes/nf-0321.html",
    },
  },
  {
    id: "outflow-seed-3",
    campaignId: CAMPAIGN.id,
    kind: "outflow",
    status: "pending",
    amount: { amountCents: 90_000, currency: "BRL" },
    occurredAt: "2026-08-15T10:00:00.000Z",
    description: "Transporte de voluntárias e assistidas",
    supplierName: "Transportadora Norte Seguro",
    txSignature:
      "4sT7dE6fG0jK2pQ9aL2nR8cVwX1bH5uYk3mQp9aL2nR8cVwX1bH4sT7dE6fG0jK2pQ",
  },
];
