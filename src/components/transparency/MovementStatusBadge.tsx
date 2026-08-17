import type { MovementStatus } from "@/domain/types";
import { Badge } from "@/components/ui/Badge";

const STATUS_LABEL: Record<MovementStatus, string> = {
  on_chain_inflow: "Entrada on-chain",
  chain_closed: "Cadeia fechada",
  pending: "Pendente",
};

const STATUS_TONE: Record<
  MovementStatus,
  "inflow" | "closed" | "pending"
> = {
  on_chain_inflow: "inflow",
  chain_closed: "closed",
  pending: "pending",
};

type MovementStatusBadgeProps = {
  status: MovementStatus;
};

export function MovementStatusBadge({ status }: MovementStatusBadgeProps) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}
