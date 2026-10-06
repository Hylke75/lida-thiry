import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesSectieVers } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { alleTags } from "@/lib/nieuwsbrief/beheer";
import { aanmeldStatistiek, alleFormulieren, blokGebruik } from "@/lib/nieuwsbrief/formulieren";
import { bevestigdPercentage, blokCode, type FormulierTelling } from "@/lib/nieuwsbrief/formulierregels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { blokVoorFormulier } from "@/lib/paginas/regels";
import { Melding } from "../../../AdminNav";
import { ActiefBadge } from "../../_editor/onderdelen";
import { dupliceerFormulier, verwijderFormulier, zetFormulierActief } from "../acties";
import { FormulierEditor } from "../FormulierEditor";
import { FormulierenKop } from "../Kop";
import { BevestigVerzend, Kopieer } from "../onderdelen";
import { kaart, knopGevaarKlein, knopKlein, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function FormulierBewerken({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; fout?: string }>;
}) {
  await vereisBeheerder("nieuwsbrief");
  const [{ id }, { ok, fout }] = await Promise.all([params, searchParams]);
  if (!UUID_PATROON.test(id)) notFound();
  const [teksten, tags, formulieren, stats, gebruik] = await Promise.all([
    leesSectieVers(NIEUWSBRIEF_AANMELDEN),
    alleTags().catch(() => [] as string[]),
    alleFormulieren(),
    aanmeldStatistiek().catch(() => new Map<string, FormulierTelling>()),
    blokGebruik(),
  ]);
  const f = formulieren.find((x) => x.id === id);
  if (!f) notFound();
  const t = stats.get(f.id);
  const paginas = gebruik.get(blokVoorFormulier(f.slug)) ?? [];
  const { id: _id, aangemaakt_op: _a, bijgewerkt_op: _b, ...begin } = f;
  void _id;
  void _a;
  void _b;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <FormulierenKop pad={[{ href: "/admin/nieuwsbrief/formulieren", label: "Formulieren" }, { label: f.naam }]} />
      <AdminKop
        titel={f.naam}
        naastTitel={<ActiefBadge actief={f.actief} />}
        acties={
          <>
            <form action={zetFormulierActief}>
              <input type="hidden" name="id" value={f.id} />
              <input type="hidden" name="actief" value={String(!f.actief)} />
              <button className={knopKlein}>{f.actief ? "Uitzetten" : "Aanzetten"}</button>
            </form>
            <form action={dupliceerFormulier}>
              <input type="hidden" name="id" value={f.id} />
              <button className={knopKlein}>Dupliceren</button>
            </form>
            <form action={verwijderFormulier}>
              <input type="hidden" name="id" value={f.id} />
              <BevestigVerzend
                className={knopGevaarKlein}
                bevestiging={`Formulier “${f.naam}” verwijderen?\n\nDe ${t?.totaal ?? 0} contact(en) die zich hiermee aanmeldden blijven gewoon aangemeld, met hun gegevens, tags en toestemming. Alleen de koppeling met dit formulier verdwijnt. De eigen pagina en de blokcode werken daarna niet meer.\n\nDit kun je niet ongedaan maken.`}
              >
                Verwijderen
              </BevestigVerzend>
            </form>
          </>
        }
      />

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      <section className={kaart}>
        <dl className="grid grid-cols-3 gap-x-4 text-sm sm:max-w-md">
          <div>
            <dt className={`text-xs ${tekstZacht}`}>Aanmeldingen</dt>
            <dd className="font-semibold tabular-nums">{(t?.totaal ?? 0).toLocaleString("nl-NL")}</dd>
          </div>
          <div>
            <dt className={`text-xs ${tekstZacht}`}>Laatste 30 dagen</dt>
            <dd className="font-semibold tabular-nums">{(t?.recent ?? 0).toLocaleString("nl-NL")}</dd>
          </div>
          <div>
            <dt className={`text-xs ${tekstZacht}`}>Bevestigd</dt>
            <dd className="font-semibold tabular-nums">{bevestigdPercentage(t)}</dd>
          </div>
        </dl>
        <div className="flex flex-col gap-1.5 text-sm">
          {f.eigen_pagina ? (
            <span className="flex flex-wrap items-center gap-2">
              <a href={`/nieuwsbrief/${f.slug}`} target="_blank" rel="noopener" className="text-accent underline underline-offset-4">
                Eigen pagina bekijken
              </a>
              <Kopieer tekst={`/nieuwsbrief/${f.slug}`} label="Kopieer pad" />
            </span>
          ) : (
            <span className={tekstZacht}>Geen eigen pagina.</span>
          )}
          <span className="flex flex-wrap items-center gap-2">
            <span className={`text-xs ${tekstZacht}`}>Op een pagina zetten (op een eigen regel in Beheer → Pagina&apos;s):</span>
            <Kopieer tekst={blokCode(f.slug)} />
          </span>
          {paginas.length > 0 && (
            <p className={`text-xs ${tekstZacht}`}>
              Staat op: {paginas.map((p) => `${p.titel}${p.status !== "gepubliceerd" ? " (concept)" : ""}`).join(", ")}
            </p>
          )}
          <Link href={`/admin/nieuwsbrief/contacten?formulier=${f.id}`} className="w-fit text-xs underline underline-offset-4">
            Contacten die zich via dit formulier aanmeldden →
          </Link>
        </div>
      </section>

      <FormulierEditor
        key={f.bijgewerkt_op}
        id={f.id}
        begin={begin}
        andereSlugs={formulieren.filter((x) => x.id !== f.id).map((x) => x.slug)}
        tagSuggesties={tags}
        standaard={teksten}
      />
    </main>
  );
}
