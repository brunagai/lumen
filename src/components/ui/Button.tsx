import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-teal text-white hover:bg-teal/90 focus-visible:outline-teal",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-teal-soft focus-visible:outline-teal",
  ghost:
    "text-teal hover:bg-teal-soft focus-visible:outline-teal",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  loading = false,
  loadingLabel = "Carregando...",
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
