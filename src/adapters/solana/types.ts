import type {
  CampaignId,
  Donation,
  InstitutionId,
  Movement,
} from "@/domain/types";
import type { PublicEnv } from "@/lib/env";
import type { Result } from "@/lib/result";

export type SolanaCluster = PublicEnv["NEXT_PUBLIC_SOLANA_CLUSTER"];

export type OnChainBalance = {
  availableBrlCents: number;
  availableUsdc: number;
};

export type ConfirmDonationInput = {
  campaignId: CampaignId;
  donorId: string;
  amountCents: number;
};

export type DonationReceipt = {
  donation: Donation;
  explorerUrl: string;
};

export type TransparencyMetrics = {
  raisedCents: number;
  usedCents: number;
  availableCents: number;
};

export type MovementRecord = Movement & {
  explorerUrl?: string;
};

export type TransparencySnapshot = {
  metrics: TransparencyMetrics;
  movements: MovementRecord[];
};

export type TransparencyScore = {
  value: number;
  max: 100;
  pendingCount: number;
  penaltyPerPending: number;
};

export type InstitutionDashboardSnapshot = {
  cluster: SolanaCluster;
  balance: OnChainBalance;
  score: TransparencyScore;
  pendingOutflows: MovementRecord[];
  snapshot: TransparencySnapshot;
};

export type PjWithdrawalInput = {
  campaignId: CampaignId;
  amountCents: number;
};

export type PaySupplierInput = {
  campaignId: CampaignId;
  amountCents: number;
  supplierName: string;
  description: string;
  invoiceNumber: string;
};

export type AttachInvoiceInput = {
  movementId: string;
  invoiceNumber: string;
  issuer: string;
};

export type SolanaPort = {
  getCluster(): SolanaCluster;
  getOnChainBalance(
    institutionId: InstitutionId,
  ): Promise<Result<OnChainBalance>>;
  confirmDonation(
    input: ConfirmDonationInput,
  ): Promise<Result<DonationReceipt>>;
  getTransparencySnapshot(
    campaignId: CampaignId,
  ): Promise<Result<TransparencySnapshot>>;
  getInstitutionDashboard(
    institutionId: InstitutionId,
  ): Promise<Result<InstitutionDashboardSnapshot>>;
  requestPjWithdrawal(
    input: PjWithdrawalInput,
  ): Promise<Result<MovementRecord>>;
  paySupplier(input: PaySupplierInput): Promise<Result<MovementRecord>>;
  attachInvoice(input: AttachInvoiceInput): Promise<Result<MovementRecord>>;
  getExplorerTxUrl(signature: string): string;
};
