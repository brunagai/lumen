import type { ReactNode } from "react";

const tones = {
  safe: "bg-safe-bg text-safe",
  verified: "bg-verified-bg text-verified",
  neutral: "bg-teal-soft text-teal",
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
