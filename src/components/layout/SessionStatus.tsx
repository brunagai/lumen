"use client";

import { useState } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";

export function SessionStatus() {
  const { session, status, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (status === "loading" || !session) {
    return null;
  }

  async function handleSignOut() {
    setIsSigningOut(true);
    await signOut();
    setIsSigningOut(false);
  }

  return (
    <div className="flex items-center gap-2 sm:border-l sm:border-white/25 sm:pl-3">
      <span className="text-sm text-white/90">{session.displayName}</span>
      <Button
        variant="inverse"
        className="px-2 py-1"
        loading={isSigningOut}
        onClick={() => void handleSignOut()}
      >
        Sair
      </Button>
    </div>
  );
}
