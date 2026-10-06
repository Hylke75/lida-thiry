import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { aanmeldStatistiek, alleFormulieren, blokGebruik } from "@/lib/nieuwsbrief/formulieren";
import { bevestigdPercentage, blokCode, NAAM_VELD_LABEL, type FormulierTelling } from "@/lib/nieuwsbrief/formulierregels";
import { blokVoorFormulier } from "@/lib/paginas/regels";
import { Melding } from "../../AdminNav";
import { ActiefBadge } from "../_editor/onderdelen";
import { zetFormulierActief } from "./acties";
import { FormulierenKop } from "./Kop";
import { Kopieer } from "./onderdelen";
import { kaart, knop, knopKlein, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const PAD = "/admin/nieuwsbrief/formulieren";

function Getal({ label, waarde }: { label: string; waarde: string | number }) {
  return (
    <div>
      <dt className={`text-xs ${tekstZacht}`}>{label}</dt>
      <dd className="font-semibold tabular-nums">{typeof waarde === "number" ? waarde.toLocaleString("nl-NL") : waarde}</dd>
    </div>
  );
}

export default async function FormulierenOverzicht({ searchParams }: { searchParams: Promise<{ ok?: string; fout?: string }> }) {
  await vereisBeheerder("nieuwsbrief");
  const { ok, fout } = await searchParams;
  const [geladen, stats, gebruik] = await Promise.all([
    alleFormulieren().then(
      (lijst) => ({ lijst, fout: null }),
      (e: Error) => ({ lijst: [], fout: e.message }),
    ),
    aanmeldStatistiek().catch(() => new Map<string, FormulierTelling>()),
    blokGebruik(),
  ]);
  const formulieren = geladen.lijst;
  const laadFout: string | null = geladen.fout;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <FormulierenKop pad={[{ label: "Formulieren" }]} />
      <AdminKop
        titel="Aanmeldformulieren"
        beschrijving="Eigen aanmeldformulieren voor de nieuwsbrief, bijvoorbeeld voor een actie of een workshop. Elk formulier kan een eigen pagina krijgen en je zet het op elke pagina met de blokcode. Nieuwe aanmelders krijgen automatisch de tags van het formulier, zodat je ze later apart kunt mailen."
        acties={
          <Link href={`${PAD}/nieuw`} className={knop}>
            Nieuw formulier
          </Link>
        }
      />

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}
      {laadFout && <Melding soort="fout">De formulieren konden niet worden geladen ({laadFout}).</Melding>}

      {formulieren.length === 0 && !laadFout && (
        <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm dark:border-white/20 ${tekstZacht}`}>
          Nog geen formulieren. Het standaard aanmeldblok op de homepage werkt ook zonder; maak een formulier als je
          aanmeldingen per actie wilt bijhouden.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {formulieren.map((f) => {
          const t = stats.get(f.id);
          const paginas = gebruik.get(blokVoorFormulier(f.slug)) ?? [];
          return (
            <li key={f.id} className={kaart}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`${PAD}/${f.id}`} className="break-words font-medium hover:text-accent hover:underline">
                    {f.naam}
                  </Link>
                  <p className={`break-words text-xs ${tekstZacht}`}>
                    {f.slug} · naam {NAAM_VELD_LABEL[f.naam_veld].toLowerCase()} ·{" "}
                    {f.dubbele_opt_in ? "dubbele opt-in" : "zonder bevestigingsmail"}
                    {f.tags.length > 0 && <> · tags: {f.tags.join(", ")}</>}
                  </p>
                </div>
                <ActiefBadge actief={f.actief} />
              </div>

              <dl className="grid grid-cols-3 gap-x-4 text-sm sm:max-w-md">
                <Getal label="Aanmeldingen" waarde={t?.totaal ?? 0} />
                <Getal label="Laatste 30 dagen" waarde={t?.recent ?? 0} />
                <Getal label="Bevestigd" waarde={bevestigdPercentage(t)} />
              </dl>

              <div className="flex flex-col gap-1.5 text-sm">
                <p className={`text-xs font-medium ${tekstZacht}`}>Waar staat het?</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  {f.eigen_pagina ? (
                    <a href={`/nieuwsbrief/${f.slug}`} target="_blank" rel="noopener" className="text-accent underline underline-offset-4">
                      Eigen pagina: /nieuwsbrief/{f.slug}
                    </a>
                  ) : (
                    <span className={tekstZacht}>Geen eigen pagina</span>
                  )}
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className={`text-xs ${tekstZacht}`}>Blokcode voor een pagina:</span>
                    <Kopieer tekst={blokCode(f.slug)} />
                  </span>
                </div>
                {paginas.length > 0 && (
                  <p className={`text-xs ${tekstZacht}`}>
                    Staat op:{" "}
                    {paginas.map((p, i) => (
                      <span key={p.slug}>
                        {i > 0 && ", "}
                        <a href={`/${p.slug}`} target="_blank" rel="noopener" className="underline underline-offset-2">
                          {p.titel}
                        </a>
                        {p.status !== "gepubliceerd" && " (concept)"}
                      </span>
                    ))}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link href={`${PAD}/${f.id}`} className={knopKlein}>
                  Bewerken
                </Link>
                <Link href={`/admin/nieuwsbrief/contacten?formulier=${f.id}`} className={knopKlein}>
                  Contacten bekijken
                </Link>
                <form action={zetFormulierActief}>
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="actief" value={String(!f.actief)} />
                  <input type="hidden" name="terug" value="lijst" />
                  <button className={knopKlein}>{f.actief ? "Uitzetten" : "Aanzetten"}</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
