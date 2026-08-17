"use client";

import { useState } from "react";

import { canAccessInstitutionPortal } from "@/adapters/auth";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { INSTITUTION } from "@/config/campaign";

export function InstitutionGate() {
  const { session, status, error, signInAsInstitution, signOut } = useAuth();
  const [pendingAction, setPendingAction] = useState<"in" | "out" | null>(
    null,
  );

  async function handleSimulateAccess() {
    setPendingAction("in");
    await signInAsInstitution();
    setPendingAction(null);
  }

  async function handleSignOut() {
    setPendingAction("out");
    await signOut();
    setPendingAction(null);
  }

  if (status === "loading") {
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-muted">Verificando acesso...</p>
      </section>
    );
  }

  if (!canAccessInstitutionPortal(session)) {
    return (
      <section className="flex flex-col gap-6">
        <p className="text-sm font-medium uppercase tracking-widest text-gold">
          Etapa 1 — fundação
        </p>
        <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
          <h1 className="text-3xl font-semibold tracking-tight text-teal">
            Acesso restrito
          </h1>
          <p className="mt-3 max-w-2xl text-muted">
            Esta área é exclusiva da instituição verificada. Na etapa 2 o
            acesso virá do Privy. Agora você pode simular a sessão para
            validar a casca do dashboard.
          </p>
          {error ? (
            <p className="mt-4 text-sm text-red-800" role="alert">
              {error.message}
            </p>
          ) : null}
          <div className="mt-6">
            <Button
              onClick={() => void handleSimulateAccess()}
              loading={pendingAction === "in"}
            >
              Simular acesso da instituição
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <p className="text-sm font-medium uppercase tracking-widest text-gold">
        Etapa 1 — fundação
      </p>
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">
          {INSTITUTION.name} — CNPJ verificado
        </h1>
        <p className="mt-1 text-sm text-muted">CNPJ {INSTITUTION.cnpj}</p>
        <p className="mt-3 max-w-2xl text-muted">
          Casca do portal interno. Saldo on-chain (R$ e USDC simulado),
          registro de despesa com nota fiscal e liberação a fornecedores
          homologados entram na próxima etapa.
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-800" role="alert">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6">
          <Button
            variant="secondary"
            onClick={() => void handleSignOut()}
            loading={pendingAction === "out"}
          >
            Encerrar sessão simulada
          </Button>
        </div>
      </div>
    </section>
  );
}
