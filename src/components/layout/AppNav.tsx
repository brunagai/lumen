"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Doar" },
  { href: "/transparencia", label: "Transparência" },
  { href: "/instituicao", label: "Instituição" },
] as const;

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Principal" className="flex flex-wrap items-center gap-1">
      {links.map((link) => {
        const isActive =
          link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isActive
                ? "bg-teal-soft text-teal"
                : "text-muted hover:bg-teal-soft hover:text-teal"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
