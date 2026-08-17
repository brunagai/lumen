import { z } from "zod";

import { AppError } from "@/lib/errors";

const urlString = z.string().refine((value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}, "URL inválida");

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SOLANA_CLUSTER: z.enum(["devnet", "testnet", "mainnet-beta"]),
  NEXT_PUBLIC_SOLANA_RPC_URL: urlString,
  NEXT_PUBLIC_EXPLORER_BASE_URL: urlString,
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

function readPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SOLANA_CLUSTER: process.env.NEXT_PUBLIC_SOLANA_CLUSTER,
    NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
    NEXT_PUBLIC_EXPLORER_BASE_URL: process.env.NEXT_PUBLIC_EXPLORER_BASE_URL,
  });

  if (!parsed.success) {
    throw new AppError(
      "ENV_INVALID",
      "Variáveis de ambiente públicas inválidas. Copie .env.example para .env.local.",
      parsed.error,
    );
  }

  return parsed.data;
}

let cachedPublicEnv: PublicEnv | undefined;

export function getPublicEnv(): PublicEnv {
  if (!cachedPublicEnv) {
    cachedPublicEnv = readPublicEnv();
  }

  return cachedPublicEnv;
}

export function shouldForceMockFailure(): boolean {
  return process.env.NEXT_PUBLIC_MOCK_FORCE_ERROR === "true";
}
