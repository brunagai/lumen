"use client";

import { useState } from "react";

import { canAccessInstitutionPortal } from "@/adapters/auth";
import { InstitutionDashboard } from "@/components/institution/InstitutionDashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/Button";
import { LoadingPanel } from "@/components/ui/StatusPanel";

export function InstitutionGate() {
  const { session, status, error, signInAsInstitution } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);

  async function handleSimulateAccess() {
    setIsSigningIn(true);
    await signInAsInstitution();
    setIsSigningIn(false);
  }

  if (status === "loading") {
    return <LoadingPanel message="Verificando acesso..." />;
  }

  if (!canAccessInstitutionPortal(session)) {
    const isDonor = session?.role === "donor";

    return (
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-teal sm:text-3xl">
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
            className="w-full sm:w-auto"
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
