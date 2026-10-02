import type { ReactNode } from "react";
import Link from "next/link";

const LINKS = [
  { href: "/admin", label: "Overzicht" },
  { href: "/admin/types", label: "Adviestypes" },
  { href: "/admin/beeldbank", label: "Beeldbank" },
  { href: "/admin/instellingen", label: "Instellingen" },
  { href: "/admin/meetinstructies", label: "Meetinstructies" },
  { href: "/admin/kortingscodes", label: "Kortingscodes" },
] as const;

export type AdminPagina = (typeof LINKS)[number]["href"];

/** Navigatiebalk bovenaan elke beheerpagina. */
export function AdminNav({ actief }: { actief?: AdminPagina }) {
  return (
    <header className="flex flex-col gap-3 border-b border-black/10 pb-4 dark:border-white/15 sm:flex-row sm:items-center sm:justify-between">
      <Link href="/admin" className="font-serif text-xl tracking-tight">
        Beheer
      </Link>
      <nav className="flex flex-wrap items-center gap-1 text-sm">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={actief === l.href ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 ${
              actief === l.href
                ? "bg-accent-zacht font-medium text-accent"
                : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
            }`}
          >
            {l.label}
          </Link>
        ))}
        <form action="/auth/uitloggen" method="post" className="ml-2">
          <button className="px-2 py-1.5 text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50">
            Uitloggen
          </button>
        </form>
      </nav>
    </header>
  );
}

/** Groene of rode melding bovenaan een pagina. */
export function Melding({ soort, children }: { soort: "ok" | "fout"; children: ReactNode }) {
  return (
    <p
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${
        soort === "ok"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {children}
    </p>
  );
}
