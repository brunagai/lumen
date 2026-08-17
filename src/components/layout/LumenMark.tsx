type LumenMarkProps = {
  className?: string;
};

export function LumenMark({ className = "h-8 w-8" }: LumenMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <circle
        cx="13.5"
        cy="13.5"
        r="8.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M13.5 17.15c-.35-.3-2.15-1.85-2.15-3.2 0-.85.7-1.55 1.55-1.55.45 0 .86.2 1.15.52.29-.32.7-.52 1.15-.52.85 0 1.55.7 1.55 1.55 0 1.35-1.8 2.9-2.15 3.2z"
        fill="currentColor"
      />
      <path
        d="M19.4 19.4 26.2 26.2"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
