import type { ReactNode } from "react";

const tones = {
  safe: "bg-safe-bg text-safe",
  verified: "bg-verified-bg text-verified",
  neutral: "bg-primary-soft text-primary",
  inflow: "bg-inflow-bg text-inflow",
  closed: "bg-closed-bg text-closed",
  pending: "bg-pending-bg text-pending",
} as const;

type BadgeProps = {
  tone?: keyof typeof tones;
  children: ReactNode;
};

export function Badge({ tone = "neutral", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
