import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { vindPlaatshouders } from "@/lib/blog/beheer";
import { onbekendeBlokken } from "@/lib/paginas/regels";
import { StatusBadge } from "../../_editor/onderdelen";
import { haalFormulieren, haalPaginaBeheer } from "../../_editor/server";
import { PaginaVoorbeeld } from "../../_editor/voorbeeld";

export const dynamic = "force-dynamic";

export default async function PaginaVoorbeeldPagina({ params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder();
  const { id } = await params;
  const [p, formulieren] = await Promise.all([haalPaginaBeheer(id), haalFormulieren()]);
  if (!p) notFound();
  const plekken = vindPlaatshouders(`${p.intro}\n${p.inhoud}`).length;
  const onbekend = onbekendeBlokken(p.inhoud, formulieren.map((f) => f.slug));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-zacht px-4 py-3 text-sm text-accent">
        <span className="flex flex-wrap items-center gap-2">
          <strong>Voorbeeld</strong> — alleen zichtbaar voor jou. <StatusBadge status={p.status} />
        </span>
        <span className="flex flex-wrap gap-3">
          {p.status === "gepubliceerd" && (
            <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Op de site bekijken ↗
            </a>
          )}
          <Link href={`/admin/paginas/${p.id}`} className="font-medium underline underline-offset-4">
            ← Terug naar bewerken
          </Link>
        </span>
      </div>
      <p className="text-xs text-foreground/55">Blokken zoals het contactformulier zie je hier als gemarkeerde vakken; op de site staat het echte blok.</p>
      {plekken > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Er {plekken === 1 ? "staat nog 1 invulplek" : `staan nog ${plekken} invulplekken`} in de tekst (zoals [aan te vullen: …]). Vul die in voordat
          je publiceert.
        </p>
      )}
      {onbekend.length > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Onbekend blok: {onbekend.map((b) => `{${b}}`).join(", ")}. Dit wordt op de site niet getoond.
        </p>
      )}
      <PaginaVoorbeeld
        titel={p.titel}
        intro={p.intro}
        inhoud={p.inhoud}
        omslagUrl={p.omslag_url}
        omslagAlt={p.omslag_alt}
        formulieren={formulieren}
      />
    </main>
  );
}
