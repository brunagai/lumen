const MIN_SECRET_LENGTH = 32;

export function tryGetSessionSecret(): string | null {
  const value = process.env.SESSION_SECRET?.trim() ?? "";

  if (value.length < MIN_SECRET_LENGTH) {
    return null;
  }

  return value;
}

export function getSessionSecret(): string {
  const secret = tryGetSessionSecret();

  if (!secret) {
    throw new Error(
      "SESSION_SECRET inválido. Defina um segredo com pelo menos 32 caracteres em .env.local.",
    );
  }

  return secret;
}
