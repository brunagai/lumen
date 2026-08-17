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
  getExplorerTxUrl(signature: string): string;
};
