import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    env: {
      NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
      NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.devnet.solana.com",
      NEXT_PUBLIC_EXPLORER_BASE_URL: "https://explorer.solana.com",
      SESSION_SECRET: "vitest-session-secret-value-32chars",
    },
  },
});
