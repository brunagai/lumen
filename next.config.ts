import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

function originFromEnv(name: string): string | undefined {
  const value = process.env[name];

  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).origin;
  } catch {
    return undefined;
  }
}

const connectSrc = [
  "'self'",
  originFromEnv("NEXT_PUBLIC_SOLANA_RPC_URL"),
  originFromEnv("NEXT_PUBLIC_EXPLORER_BASE_URL"),
]
  .filter((value): value is string => Boolean(value))
  .join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  `connect-src ${connectSrc}`,
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
