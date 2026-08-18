import Link from "next/link";

import { AppNav } from "@/components/layout/AppNav";
import { LumenMark } from "@/components/layout/LumenMark";
import { SessionStatus } from "@/components/layout/SessionStatus";
import { Badge } from "@/components/ui/Badge";

export function Header() {
  return (
    <header className="bg-secondary text-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-3 sm:gap-4">
          <Link
            href="/"
            className="flex items-center rounded-xl bg-base p-1.5"
            aria-label="Lúmen. Página inicial"
          >
            <LumenMark />
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="safe">Ambiente Seguro</Badge>
            <Badge tone="verified">Instituição Verificada</Badge>
          </div>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center gap-3 sm:w-auto">
          <AppNav />
          <SessionStatus />
        </div>
      </div>
    </header>
  );
}
