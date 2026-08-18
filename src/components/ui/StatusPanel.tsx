import { Button } from "@/components/ui/Button";

type LoadingPanelProps = {
  message: string;
};

export function LoadingPanel({ message }: LoadingPanelProps) {
  return (
    <p
      className="rounded-2xl border border-border bg-surface p-5 text-muted sm:p-6"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

type ErrorPanelProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div
      className="rounded-2xl border border-border bg-surface p-5 sm:p-6"
      role="alert"
    >
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button variant="secondary" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
    </div>
  );
}
