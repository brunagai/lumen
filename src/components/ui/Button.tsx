import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = {
  primary:
    "bg-accent text-ink hover:bg-accent-hover focus-visible:outline-accent disabled:border disabled:border-border disabled:bg-accent-soft disabled:text-muted disabled:hover:bg-accent-soft",
  secondary:
    "border border-border bg-surface text-foreground hover:bg-primary-soft hover:text-primary focus-visible:outline-primary disabled:text-muted",
  ghost:
    "text-primary hover:bg-primary-soft focus-visible:outline-primary",
  inverse:
    "border border-white/40 bg-transparent text-white hover:bg-white/10 focus-visible:outline-white",
  institutional:
    "bg-primary text-white hover:bg-primary/90 focus-visible:outline-primary disabled:bg-primary-soft disabled:text-muted",
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
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading ? loadingLabel : children}
    </button>
  );
}
