import Link from "next/link";
import type { ReactNode } from "react";

/** Eenvoudige, gecentreerde pagina voor bevestigen en afmelden. */
export function Kader({ titel, tekst, children }: { titel: string; tekst?: string; children?: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-5 px-6 py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{titel}</h1>
      {tekst && <p className="whitespace-pre-line text-foreground/70">{tekst}</p>}
      {children}
      <Link href="/" className="mx-auto mt-4 text-sm text-foreground/50 underline underline-offset-4 hover:text-accent">
        ← Naar de startpagina
      </Link>
    </main>
  );
}
