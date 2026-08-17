"use client";

import { useState } from "react";

import type { AuthMethod, Session } from "@/adapters/auth";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

const AUTH_OPTIONS: {
  method: AuthMethod;
  label: string;
  description: string;
}[] = [
  {
    method: "email",
    label: "Continuar com e-mail",
    description: "Simula o login Privy por e-mail.",
  },
  {
    method: "google",
    label: "Continuar com Google",
    description: "Simula o login Privy com Google.",
  },
  {
    method: "wallet",
    label: "Continuar com carteira",
    description: "Simula a conexão de uma carteira Web3.",
  },
];

type AuthModalProps = {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (session: Session) => void;
};

export function AuthModal({ open, onClose, onAuthenticated }: AuthModalProps) {
  const { signIn, error } = useAuth();
  const [pendingMethod, setPendingMethod] = useState<AuthMethod | null>(null);

  async function handleSignIn(method: AuthMethod) {
    setPendingMethod(method);
    const result = await signIn({ method, role: "donor" });
    setPendingMethod(null);

    if (result.ok) {
      onAuthenticated(result.value);
    }
  }

  function handleClose() {
    if (pendingMethod) {
      return;
    }

    onClose();
  }

  return (
    <Modal open={open} title="Entrar para doar" onClose={handleClose}>
      <p className="mb-5 text-sm text-muted">
        Escolha como entrar. Este modal simula o fluxo do Privy (e-mail, Google
        ou carteira) e grava a sessão localmente.
      </p>
      <ul className="flex flex-col gap-2">
        {AUTH_OPTIONS.map((option) => (
          <li key={option.method}>
            <Button
              variant="secondary"
              className="w-full"
              loading={pendingMethod === option.method}
              disabled={pendingMethod !== null && pendingMethod !== option.method}
              onClick={() => void handleSignIn(option.method)}
            >
              {option.label}
            </Button>
            <p className="mt-1 px-1 text-xs text-muted">{option.description}</p>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-4 text-sm text-red-800" role="alert">
          {error.message}
        </p>
      ) : null}
    </Modal>
  );
}
