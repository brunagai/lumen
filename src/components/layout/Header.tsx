import Link from "next/link";

import { AppNav } from "@/components/layout/AppNav";
import { LumenMark } from "@/components/layout/LumenMark";
import { SessionStatus } from "@/components/layout/SessionStatus";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-teal"
            aria-label="Lúmen. Página inicial"
          >
            <LumenMark />
            <span className="text-xl font-semibold tracking-tight">Lúmen.</span>
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="safe">Ambiente Seguro</Badge>
            <Badge tone="verified">Instituição Verificada</Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <AppNav />
          <SessionStatus />
        </div>
      </div>
    </header>
  );
}
