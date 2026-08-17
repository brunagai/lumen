"use client";

import { useState } from "react";

import { canAccessInstitutionPortal } from "@/adapters/auth";
import { InstitutionDashboard } from "@/components/institution/InstitutionDashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";

export function InstitutionGate() {
  const { session, status, error, signInAsInstitution } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSimulateAccess() {
    setIsSigningIn(true);
    await signInAsInstitution();
    setIsSigningIn(false);
  }

  if (status === "loading") {
    return (
      <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <p className="text-muted">Verificando acesso...</p>
      </section>
    );
  }

  if (!canAccessInstitutionPortal(session)) {
    const isDonor = session?.role === "donor";

    return (
      <section className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-teal">
          Acesso restrito
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          {isDonor
            ? "Sua sessão atual é de doadora. Entre como a instituição verificada para gerenciar o saldo e a prestação de contas."
            : "Esta área é exclusiva da Casa da Mulher. Simule o acesso institucional para abrir o dashboard."}
        </p>
        {error ? (
          <p className="mt-4 text-sm text-red-800" role="alert">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6">
          <Button
            onClick={() => void handleSimulateAccess()}
            loading={isSigningIn}
          >
            Entrar como Casa da Mulher
          </Button>
        </div>
      </section>
    );
  }

  return <InstitutionDashboard />;
}
