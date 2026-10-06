import Link from "next/link";
import type { ReactNode } from "react";
import { tekstZacht } from "./stijl";

type Props = {
  /** Paginatitel (de h1). */
  titel: ReactNode;
  /** Korte uitleg onder de titel (inline-inhoud; komt in een <p>). */
  beschrijving?: ReactNode;
  /** Knoppen of links rechts naast de titel (op smalle schermen eronder). */
  acties?: ReactNode;
  /** Iets direct naast de titel, zoals een statuslabel of badges. */
  naastTitel?: ReactNode;
  /** Terug-link boven de kop, bijv. `{ href: "/admin/blog", label: "Alle artikelen" }`. */
  terug?: { href: string; label: ReactNode };
  /** Extra klassen voor de h1 (bijv. `font-mono` of `break-all`). */
  titelKlasse?: string;
  /** Extra inhoud onder de beschrijving, binnen de kop (bijv. filters of een periodekeuze). */
  children?: ReactNode;
};

/**
 * Kop van een beheerpagina: h1 met optionele uitleg, acties en terug-link. Hoort direct onder `AdminNav`
 * in de `<main>` (een flex-kolom met gap), net als de rest van de pagina-inhoud.
 */
export function AdminKop({ titel, beschrijving, acties, naastTitel, terug, titelKlasse, children }: Props) {
  const h1 = <h1 className={`min-w-0 break-words text-2xl font-semibold tracking-tight ${titelKlasse ?? ""}`}>{titel}</h1>;
  return (
    <>
      {terug && (
        <Link href={terug.href} className={`w-fit text-sm ${tekstZacht} underline-offset-4 hover:underline`}>
          ← {terug.label}
        </Link>
      )}
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-[1_1_20rem] flex-col gap-1">
          {naastTitel ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {h1}
              {naastTitel}
            </div>
          ) : (
            h1
          )}
          {beschrijving && <p className={`text-sm ${tekstZacht}`}>{beschrijving}</p>}
          {children}
        </div>
        {acties && <div className="flex flex-wrap items-center gap-2">{acties}</div>}
      </header>
    </>
  );
}
