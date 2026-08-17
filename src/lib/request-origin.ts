export function isTrustedMutationOrigin(request: {
  method: string;
  origin: string | null;
  host: string | null;
}): boolean {
  if (request.method === "GET" || request.method === "HEAD") {
    return true;
  }

  if (!request.origin || !request.host) {
    return false;
  }

  try {
    const originHost = new URL(request.origin).host;
    const requestHost = request.host.split(",")[0]?.trim() ?? "";

    return originHost.length > 0 && originHost === requestHost;
  } catch {
    return false;
  }
}

export function readMutationOriginHeaders(request: Request): {
  origin: string | null;
  host: string | null;
} {
  return {
    origin: request.headers.get("origin"),
    host:
      request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
  };
}
