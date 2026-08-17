export function originFromUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

export function buildContentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  const connectSrc = [
    "'self'",
    originFromUrl(process.env.NEXT_PUBLIC_SOLANA_RPC_URL),
    originFromUrl(process.env.NEXT_PUBLIC_EXPLORER_BASE_URL),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    `connect-src ${connectSrc}`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
