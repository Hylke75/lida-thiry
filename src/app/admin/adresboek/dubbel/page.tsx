import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import type { Relatie } from "@/lib/relaties/regels";
import { alleRelaties } from "@/lib/relaties/beheer";
import { DUBBEL_REDEN_LABEL, SAMENVOEG_VELDEN, standaardKeuzes, VELD_LABEL, vindDubbelen } from "@/lib/relaties/dubbel";
import { pastBijZoekterm, sorteerRelaties, weergaveNaam } from "@/lib/relaties/zoeken";
import { AdminNav, Melding } from "../../AdminNav";
import { BevestigKnop } from "../../nieuwsbrief/contacten/Invoer";
import { voegSamenActie } from "../acties";
import { PAD } from "../ui";
import { invoer, kaart, knop, knopKlein, tekstZacht } from "@/components/admin/stijl";
import { datum } from "@/lib/datum";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const DUBBEL = `${PAD}/dubbel`;

function Kort({ r }: { r: Relatie }) {
  return (
    <span className="flex min-w-0 flex-col">
      <Link href={`${PAD}/${r.id}`} className="break-words font-medium hover:text-accent hover:underline">
        {weergaveNaam(r)}
      </Link>
      <span className={`break-all text-xs ${tekstZacht}`}>
        {[r.email, r.telefoon, [r.postcode, r.plaats].filter(Boolean).join(" ")].filter(Boolean).join(" · ") || "geen contactgegevens"}
      </span>
    </span>
  );
}

const een = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() ?? "";

export default async function DubbelPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("adresboek");
  const zoek = await searchParams;
  const aId = een(zoek.a);
  const bId = een(zoek.b);
  const q = een(zoek.q).slice(0, 100);
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  let relaties: Relatie[] = [];
  let laadFout: string | null = null;
  try {
    relaties = await alleRelaties();
  } catch (e) {
    laadFout = `Adresboek laden mislukt: ${e instanceof Error ? e.message : String(e)}`;
  }
  const opId = new Map(relaties.map((r) => [r.id, r]));
  const a = UUID_PATROON.test(aId) ? opId.get(aId) : undefined;
  const b = UUID_PATROON.test(bId) && bId !== aId ? opId.get(bId) : undefined;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/adresboek" />
      <AdminKop
        terug={{ href: a && !b ? `${PAD}/${a.id}` : a && b ? DUBBEL : PAD, label: a && !b ? weergaveNaam(a) : a && b ? "Alle dubbelen" : "Adresboek" }}
        titel={a && b ? "Samenvoegen" : "Dubbele relaties"}
      />

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || laadFout) && <Melding soort="fout">{fout ?? laadFout}</Melding>}
      {(aId || bId) && (!a || (bId && !b)) && !laadFout && (
        <Melding soort="fout">Een van de gekozen relaties bestaat niet (meer).</Melding>
      )}

      {a && b ? <Vergelijk blijft={a} weg={b} /> : a ? <KiesTweede a={a} q={q} relaties={relaties} /> : <Lijst relaties={relaties} />}
    </main>
  );
}

function Lijst({ relaties }: { relaties: Relatie[] }) {
  const paren = vindDubbelen(relaties);
  return (
    <>
      <p className={`text-sm ${tekstZacht}`}>
        Relaties die waarschijnlijk dezelfde persoon zijn: dezelfde naam en postcode, hetzelfde telefoonnummer of dezelfde
        naam met een ander e-mailadres. Controleer altijd even of het echt om dezelfde persoon gaat.
      </p>
      {paren.length === 0 ? (
        <p className={`text-sm ${tekstZacht}`}>Geen waarschijnlijke dubbelen gevonden. Netjes!</p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
          {paren.map((p) => (
            <li key={`${p.a.id}|${p.b.id}`} className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <Kort r={p.a} />
                <Kort r={p.b} />
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
                <span className="flex flex-wrap gap-1">
                  {p.redenen.map((r) => (
                    <span key={r} className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {DUBBEL_REDEN_LABEL[r]}
                    </span>
                  ))}
                </span>
                <Link href={`${DUBBEL}?a=${p.a.id}&b=${p.b.id}`} className={knopKlein}>
                  Vergelijken
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function KiesTweede({ a, q, relaties }: { a: Relatie; q: string; relaties: Relatie[] }) {
  const resultaten = q ? sorteerRelaties(relaties.filter((r) => r.id !== a.id && pastBijZoekterm(r, q))).slice(0, 20) : [];
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Met wie wil je {weergaveNaam(a)} samenvoegen?</h2>
      <form action={DUBBEL} method="get" className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="a" value={a.id} />
        <input name="q" defaultValue={q} placeholder="Zoek op naam, e-mail, telefoon of plaats" aria-label="Zoeken" className={`${invoer} flex-1`} />
        <button className={knop}>Zoeken</button>
      </form>
      {q && resultaten.length === 0 && <p className={`text-sm ${tekstZacht}`}>Niemand gevonden.</p>}
      {resultaten.length > 0 && (
        <ul className="flex flex-col divide-y divide-black/5 text-sm dark:divide-white/10">
          {resultaten.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 py-2">
              <Kort r={r} />
              <Link href={`${DUBBEL}?a=${a.id}&b=${r.id}`} className={`${knopKlein} shrink-0`}>
                Kiezen
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function waarde(r: Relatie, v: (typeof SAMENVOEG_VELDEN)[number]): string {
  const w = r[v];
  if (!w) return "";
  return v === "geboortedatum" ? datum(w) : w;
}

function Vergelijk({ blijft, weg }: { blijft: Relatie; weg: Relatie }) {
  const keuzes = standaardKeuzes(blijft, weg);
  const tags = [...new Set([...blijft.tags, ...weg.tags])];
  return (
    <form action={voegSamenActie} className="flex flex-col gap-5">
      <input type="hidden" name="blijft" value={blijft.id} />
      <input type="hidden" name="weg" value={weg.id} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1 rounded-lg border border-emerald-300 bg-emerald-50/50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950/20">
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-300">Blijft bestaan</span>
          <Kort r={blijft} />
          <span className={`text-xs ${tekstZacht}`}>sinds {datum(blijft.aangemaakt_op)}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border border-black/10 p-3 text-sm dark:border-white/15">
          <span className={`text-xs font-medium uppercase tracking-wide ${tekstZacht}`}>Wordt opgenomen en verwijderd</span>
          <Kort r={weg} />
          <span className={`text-xs ${tekstZacht}`}>sinds {datum(weg.aangemaakt_op)}</span>
        </div>
      </div>
      <div>
        <Link href={`${DUBBEL}?a=${weg.id}&b=${blijft.id}`} className="text-sm underline underline-offset-4">
          Andersom: laat {weergaveNaam(weg)} bestaan
        </Link>
      </div>

      <fieldset className={kaart}>
        <legend className="sr-only">Kies per veld welke waarde blijft</legend>
        <h2 className="text-lg font-semibold">Kies per gegeven wat blijft</h2>
        <div className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {SAMENVOEG_VELDEN.map((v) => {
            const x = waarde(blijft, v);
            const y = waarde(weg, v);
            const gelijk = (blijft[v] ?? "") === (weg[v] ?? "");
            return (
              <div key={v} className="grid gap-1 py-2 text-sm sm:grid-cols-[10rem_1fr_1fr] sm:items-center sm:gap-3">
                <span className={tekstZacht}>{VELD_LABEL[v]}</span>
                {gelijk ? (
                  <>
                    <input type="hidden" name={`veld_${v}`} value="blijft" />
                    <span className="break-all sm:col-span-2">{x || <span className={tekstZacht}>leeg</span>}</span>
                  </>
                ) : (
                  (["blijft", "weg"] as const).map((kant) => (
                    <label key={kant} className="flex min-w-0 items-start gap-2 rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5">
                      <input type="radio" name={`veld_${v}`} value={kant} defaultChecked={keuzes[v] === kant} className="mt-1 accent-accent" />
                      <span className="min-w-0 break-all">{(kant === "blijft" ? x : y) || <span className={tekstZacht}>leeg</span>}</span>
                    </label>
                  ))
                )}
              </div>
            );
          })}
          <div className="grid gap-1 py-2 text-sm sm:grid-cols-[10rem_1fr] sm:gap-3">
            <span className={tekstZacht}>Tags</span>
            <span className="flex flex-wrap gap-1">
              {tags.length ? tags.map((t) => <span key={t} className="rounded-full bg-accent-zacht px-2 py-0.5 text-xs text-accent">{t}</span>) : <span className={tekstZacht}>geen</span>}
              <span className={`w-full text-xs ${tekstZacht}`}>Alle tags van beide worden bewaard.</span>
            </span>
          </div>
          <div className="grid gap-1 py-2 text-sm sm:grid-cols-[10rem_1fr] sm:gap-3">
            <span className={tekstZacht}>Notities</span>
            <span className={`text-xs ${tekstZacht}`}>De notities van beide worden achter elkaar bewaard, met bovenaan een notitie over het samenvoegen.</span>
          </div>
        </div>
      </fieldset>

      <div className={`flex flex-col gap-2 rounded-lg border border-black/10 p-4 text-sm dark:border-white/15 ${tekstZacht}`}>
        <p>
          <strong>Goed om te weten:</strong> contactberichten gaan mee naar de relatie die blijft. Bestellingen en de nieuwsbrief
          zijn gekoppeld via hun eigen e-mailadres en veranderen niet. Kies je hierboven het e-mailadres{" "}
          {weg.email ? <strong className="break-all">{weg.email}</strong> : "van de andere relatie"}, dan zie je vanaf nu de
          bestellingen en nieuwsbrief van dát adres; die van het andere adres blijven bestaan maar staan dan niet meer in de
          geschiedenis van deze relatie.
        </p>
      </div>

      <div>
        <BevestigKnop
          bevestiging={`${weergaveNaam(weg)} samenvoegen met ${weergaveNaam(blijft)}? De tweede relatie wordt verwijderd; dit kan niet ongedaan worden gemaakt.`}
          className={knop}
        >
          Samenvoegen
        </BevestigKnop>
      </div>
    </form>
  );
}
