import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { vindPlaatshouders } from "@/lib/blog/beheer";
import { zichtbaarheid } from "@/lib/blog/regels";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { haalBericht } from "../../_editor/server";
import { Artikel } from "../../_editor/Artikel";
import { ZichtbaarheidBadge } from "../../_editor/onderdelen";

export const dynamic = "force-dynamic";

export default async function BlogVoorbeeld({ params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder("blog");
  const { id } = await params;
  const b = await haalBericht(id);
  if (!b) notFound();
  const status = zichtbaarheid(b);
  const plekken = vindPlaatshouders(b.inhoud).length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent-zacht px-4 py-3 text-sm text-accent">
        <span className="flex flex-wrap items-center gap-2">
          <strong>Voorbeeld</strong> — alleen zichtbaar voor jou. <ZichtbaarheidBadge status={status} />
          {status === "ingepland" && <span>Verschijnt op {toonDatumTijd(b.gepubliceerd_op)}.</span>}
        </span>
        <span className="flex flex-wrap gap-3">
          {status === "online" && (
            <a href={`/blog/${b.slug}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
              Op de site bekijken ↗
            </a>
          )}
          <Link href={`/admin/blog/${b.id}`} className="font-medium underline underline-offset-4">
            ← Terug naar bewerken
          </Link>
        </span>
      </div>
      {plekken > 0 && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          Er {plekken === 1 ? "staat nog 1 invulplek" : `staan nog ${plekken} invulplekken`} in de tekst (zoals [foto: …]). Vervang
          die voordat je publiceert.
        </p>
      )}
      <Artikel
        titel={b.titel}
        samenvatting={b.samenvatting}
        inhoud={b.inhoud}
        omslagUrl={b.omslag_url}
        omslagAlt={b.omslag_alt}
        auteur={b.auteur}
        categorie={b.categorie}
        tags={b.tags}
        gepubliceerdOp={status === "concept" ? null : b.gepubliceerd_op}
      />
    </main>
  );
}
