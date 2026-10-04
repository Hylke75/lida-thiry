import Link from "next/link";
import type { ReactNode } from "react";
import { vereisBeheerder } from "@/lib/admin-auth";
import { alleDoorverwijzingen } from "@/lib/doorverwijzingen/beheer";
import { bestemmingsPad, filterDoorverwijzingen, vanInLus, type DoorverwijzingRij } from "@/lib/doorverwijzingen/regels";
import { AdminNav, Melding } from "../AdminNav";
import { verwijderDoorverwijzing } from "./acties";
import { DoorverwijzingFormulier } from "./Formulier";
import { ImportDoorverwijzingen } from "./Import";
import { TestAdres } from "./TestAdres";
import { datum, heelZacht, invoer, kaart, kleineKnop, PAD, zacht } from "./stijl";

export const dynamic = "force-dynamic";

const MAX_TONEN = 300;

type Zoek = Promise<{ q?: string; bewerk?: string; ok?: string; fout?: string }>;

function Badge({ children, kleur }: { children: ReactNode; kleur: string }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${kleur}`}>{children}</span>;
}

const GRIJS = "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70";
const BLAUW = "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300";
const ROOD = "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300";
const AMBER = "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300";

export default async function DoorverwijzingenPage({ searchParams }: { searchParams: Zoek }) {
  await vereisBeheerder();
  const { q = "", bewerk, ok, fout } = await searchParams;

  let rijen: DoorverwijzingRij[] = [];
  let laadFout: string | null = null;
  try {
    rijen = await alleDoorverwijzingen();
  } catch (e) {
    laadFout = e instanceof Error ? e.message : String(e);
  }
  const lus = vanInLus(rijen);
  const vanSet = new Set(rijen.map((r) => r.van));
  const gefilterd = filterDoorverwijzingen(rijen, q);
  const bewerkRij = bewerk ? rijen.find((r) => r.id === bewerk) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-8">
      {/* Cast: de link "Doorverwijzingen" komt in het menu onder Website. */}
      <AdminNav actief="/admin/doorverwijzingen" />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Doorverwijzingen</h1>
        <p className={`text-sm ${zacht}`}>
          Stuur bezoekers van een oud adres automatisch door naar een nieuw adres, bijvoorbeeld na het hernoemen van een pagina of bij een
          verhuisde website. Verandert het webadres van een gepubliceerde pagina, blogbericht of nieuwsbriefpagina, dan wordt de doorverwijzing
          automatisch gemaakt.
        </p>
        <p className={`text-xs ${heelZacht}`}>
          Wijzigingen kunnen tot een minuut duren voordat ze overal op de website werken. Een doorverwijzing gaat vóór een pagina die op hetzelfde
          adres staat.
        </p>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}
      {laadFout && <Melding soort="fout">Doorverwijzingen laden mislukt: {laadFout}</Melding>}

      <section className={kaart}>
        <h2 className="text-lg font-semibold">{bewerkRij ? "Doorverwijzing aanpassen" : "Nieuwe doorverwijzing"}</h2>
        <DoorverwijzingFormulier
          key={bewerkRij?.id ?? "nieuw"}
          waarden={
            bewerkRij
              ? { id: bewerkRij.id, van: bewerkRij.van, naar: bewerkRij.naar, permanent: bewerkRij.permanent, automatisch: bewerkRij.automatisch }
              : undefined
          }
        />
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Test een adres</h2>
        <p className={`text-sm ${zacht}`}>Zie wat er gebeurt als iemand dit adres bezoekt (met de doorverwijzingen zoals ze nu zijn opgeslagen).</p>
        <TestAdres />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-sm font-semibold uppercase tracking-wide ${heelZacht}`}>
            {q ? `${gefilterd.length} van ${rijen.length}` : `Alle doorverwijzingen (${rijen.length})`}
          </h2>
          <a href={`${PAD}/export`} className={kleineKnop}>
            CSV exporteren
          </a>
        </div>
        <form className="flex flex-wrap gap-2" role="search">
          <input name="q" defaultValue={q} placeholder="Zoek op oud of nieuw adres" aria-label="Zoeken" className={`${invoer} flex-1`} />
          <button className={kleineKnop}>Zoeken</button>
          {q && (
            <Link href={PAD} className="self-center text-xs underline underline-offset-4">
              Wissen
            </Link>
          )}
        </form>

        {gefilterd.length === 0 ? (
          <p className={`text-sm ${heelZacht}`}>{q ? "Geen doorverwijzingen gevonden." : "Nog geen doorverwijzingen."}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {gefilterd.slice(0, MAX_TONEN).map((r) => {
              const verder = bestemmingsPad(r.naar);
              const keten = verder !== null && vanSet.has(verder);
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-2 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm dark:border-white/15 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 font-mono">
                      <span className="break-all font-medium">{r.van}</span>
                      <span aria-hidden className={heelZacht}>
                        →
                      </span>
                      <span className="sr-only">naar</span>
                      <span className="break-all">{r.naar}</span>
                    </span>
                    <span className={`flex flex-wrap items-center gap-2 text-xs ${heelZacht}`}>
                      <Badge kleur={r.permanent ? GRIJS : AMBER}>{r.permanent ? "Permanent" : "Tijdelijk"}</Badge>
                      {r.automatisch && <Badge kleur={BLAUW}>Automatisch</Badge>}
                      {lus.has(r.van) && <Badge kleur={ROOD}>Rondje: werkt niet</Badge>}
                      {!lus.has(r.van) && keten && <Badge kleur={AMBER}>Verwijst door naar een doorverwijzing</Badge>}
                      <span>
                        {r.aantal_gebruikt === 1 ? "1 keer gebruikt" : `${r.aantal_gebruikt.toLocaleString("nl-NL")} keer gebruikt`}
                        {r.laatst_gebruikt_op ? `, laatst ${datum(r.laatst_gebruikt_op)}` : ""}
                      </span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <Link href={`${PAD}?bewerk=${r.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={kleineKnop}>
                      Aanpassen
                    </Link>
                    <form action={verwijderDoorverwijzing}>
                      <input type="hidden" name="id" value={r.id} />
                      <button className={`${kleineKnop} border-red-300 text-red-700 dark:border-red-800 dark:text-red-300`}>Verwijderen</button>
                    </form>
                  </span>
                </li>
              );
            })}
            {gefilterd.length > MAX_TONEN && (
              <li className={`text-xs ${heelZacht}`}>
                Er worden {MAX_TONEN} van de {gefilterd.length} getoond. Zoek om de lijst te verkleinen.
              </li>
            )}
          </ul>
        )}
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">CSV importeren</h2>
        <ImportDoorverwijzingen />
      </section>
    </main>
  );
}
