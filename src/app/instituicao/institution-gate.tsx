"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { canAccessInstitutionPortal } from "@/adapters/auth";
import { InstitutionDashboard } from "@/components/institution/InstitutionDashboard";
import { useAuth } from "@/components/providers/auth-provider";
import { LoadingPanel } from "@/components/ui/StatusPanel";

export function InstitutionGate() {
  const router = useRouter();
  const { session, status } = useAuth();

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (!canAccessInstitutionPortal(session)) {
      const motivo = session ? "papel-insuficiente" : "nao-autenticado";
      router.replace(`/?acesso=instituicao&motivo=${motivo}`);
    }
  }, [router, session, status]);

  if (status === "loading" || !canAccessInstitutionPortal(session)) {
    return <LoadingPanel message="Verificando acesso..." />;
  }

  return <InstitutionDashboard />;
}
