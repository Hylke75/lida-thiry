/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */
import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls, sorteerSleutel } from "@/lib/beeldbank";
import { letterNaam } from "@/lib/adviestypes-beheer";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { AdminNav } from "../../AdminNav";
import { ActieFormulier, GroeiendTekstvak } from "../ActieFormulier";
import { BeeldKiezer } from "../BeeldKiezer";
import { KopieerSectie, type TypeKeuze } from "../KopieerSectie";
import { formatteerMoment } from "../gedeeld";
import {
  slaSectieOp,
  slaTypeOp,
  verplaatsBeeld,
  verwijderBeeld,
  verwijderSectie,
  vulVeld,
} from "../acties";

export const dynamic = "force-dynamic";

interface Type {
  sleutel: string;
  letter: string;
  categorie: number;
  titel: string;
  lengte_label: string | null;
  maat_label: string | null;
  bijgewerkt_op: string | null;
}

interface SectieBeeld {
  volgorde: number;
  beeld_id: string;
  code: string;
  naam: string | null;
  bijschrift: string | null;
  url: string | null;
}

interface Veld {
  sleutel: string;
  kop: string;
  volgorde: number;
  groep: string;
  hulptekst: string | null;
}

interface Sectie {
  id: string;
  veld_sleutel: string | null;
  volgorde: number;
  kop: string;
  tekst: string;
  beelden: SectieBeeld[];
}

async function laad(sleutel: string) {
  const supabase = adminClient();
  const [typeRes, sectiesRes, alleRes, veldenRes] = await Promise.all([
    supabase
      .from("adviestypes")
      .select(
        "sleutel, letter, categorie, titel, lengte_label, maat_label, bijgewerkt_op",
      )
      .eq("sleutel", sleutel)
      .maybeSingle(),
    supabase
      .from("adviessecties")
      .select(
        "id, veld_sleutel, volgorde, kop, tekst, sectie_beelden(volgorde, beeld_id, beelden(code, naam, bijschrift, pad, thumb_pad))",
      )
      .eq("type_sleutel", sleutel)
      .order("volgorde", { ascending: true }),
    supabase.from("adviestypes").select("sleutel, titel, letter, categorie"),
    supabase
      .from("advies_velden")
      .select("sleutel, kop, volgorde, groep, hulptekst")
      .order("volgorde"),
  ]);
  const type = typeRes.data as Type | null;
  if (!type) return null;
  if (sectiesRes.error)
    throw new Error(`secties lezen: ${sectiesRes.error.message}`);

  type Rij = {
    id: string;
    veld_sleutel: string | null;
    volgorde: number;
    kop: string;
    tekst: string;
    sectie_beelden: {
      volgorde: number;
      beeld_id: string;
      beelden: {
        code: string;
        naam: string | null;
        bijschrift: string | null;
        pad: string;
        thumb_pad: string | null;
      };
    }[];
  };
  const rijen = (sectiesRes.data ?? []) as unknown as Rij[];
  const urls = await beeldUrls(
    rijen.flatMap((s) =>
      s.sectie_beelden.map((sb) => sb.beelden.thumb_pad ?? sb.beelden.pad),
    ),
  );
  const secties: Sectie[] = rijen.map((s) => ({
    id: s.id,
    veld_sleutel: s.veld_sleutel,
    volgorde: s.volgorde,
    kop: s.kop,
    tekst: s.tekst,
    beelden: [...s.sectie_beelden]
      .sort((a, b) => a.volgorde - b.volgorde)
      .map((sb) => ({
        volgorde: sb.volgorde,
        beeld_id: sb.beeld_id,
        code: sb.beelden.code,
        naam: sb.beelden.naam,
        bijschrift: sb.beelden.bijschrift,
        url: urls[sb.beelden.thumb_pad ?? sb.beelden.pad] ?? null,
      })),
  }));
  const alle = ((alleRes.data ?? []) as TypeKeuze[]).sort(
    (a, b) => sorteerSleutel(a.sleutel) - sorteerSleutel(b.sleutel),
  );
  const velden = (veldenRes.data ?? []) as Veld[];
  return { type, secties, alle, velden };
}

const invoer =
  "w-full rounded-lg border border-black/15 bg-background px-3 py-2 outline-none focus:border-accent dark:border-white/20";
const kleineKnop =
  "rounded-full border border-black/15 px-3 py-1 text-xs text-black/70 hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30 dark:border-white/20 dark:text-white/70";
const hoofdKnop =
  "rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90";

function Verborgen({ waarden }: { waarden: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(waarden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

/** Uitleg van de opmaak die de PDF begrijpt (zie schoon() en blokken() in de PDF-code). */
function OpmaakUitleg() {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-black/60 dark:text-white/60">
      <li>
        <strong>Lege regel</strong> = nieuwe alinea. Regels direct onder elkaar
        (zonder lege regel) worden in de PDF aan elkaar geplakt tot één alinea.
      </li>
      <li>
        Een regel die begint met <code>- </code> (streepje en spatie) of{" "}
        <code>• </code> wordt een <strong>opsommingsteken</strong>.
      </li>
      <li>
        <code>**vet**</code> wordt <strong>vet</strong>, bijvoorbeeld voor
        modelnamen: <code>**Bootcut**: een taille die…</code>
      </li>
      <li>
        <code>*cursief*</code> wordt <em>cursief</em>, bijvoorbeeld voor een
        tip.
      </li>
      <li>
        Een backslash (<code>\</code>) aan het eind van een regel wordt
        weggelaten.
      </li>
    </ul>
  );
}

export default async function TypeEditor({
  params,
}: {
  params: Promise<{ sleutel: string }>;
}) {
  await vereisBeheerder("advies");
  const { sleutel: ruw } = await params;
  const sleutel = decodeURIComponent(ruw);
  const geladen = await laad(sleutel);
  if (!geladen) notFound();
  const { type, secties, alle, velden } = geladen;
  const perVeld = new Map(
    secties.filter((s) => s.veld_sleutel).map((s) => [s.veld_sleutel!, s]),
  );
  const overige = secties.filter((s) => !s.veld_sleutel);
  const groepen = [...new Set(velden.map((v) => v.groep))];
  const letters = (await haalLichaamstypes()).map((t) => ({ letter: t.code, naam: t.naam }));

  const plek = alle.findIndex((t) => t.sleutel === sleutel);
  const vorige = plek > 0 ? alle[plek - 1] : null;
  const volgende = plek >= 0 && plek < alle.length - 1 ? alle[plek + 1] : null;
  const andereTypes = alle.filter((t) => t.sleutel !== sleutel);
  const aantalBeelden = secties.reduce((n, s) => n + s.beelden.length, 0);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/types" />

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link
          href="/admin/types"
          className="text-black/60 underline-offset-4 hover:underline dark:text-white/60"
        >
          ← Alle adviestypes
        </Link>
        <span className="flex gap-3 text-black/60 dark:text-white/60">
          {vorige && (
            <Link
              href={`/admin/types/${vorige.sleutel}`}
              className="underline-offset-4 hover:underline"
            >
              ← {vorige.sleutel}
            </Link>
          )}
          {volgende && (
            <Link
              href={`/admin/types/${volgende.sleutel}`}
              className="underline-offset-4 hover:underline"
            >
              {volgende.sleutel} →
            </Link>
          )}
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-black/50 dark:text-white/50">
            Type {type.sleutel} · categorie {type.categorie} ·{" "}
            {letterNaam(type.letter, letters)}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {type.titel}
          </h1>
          <p className="text-xs text-black/50 dark:text-white/50">
            {perVeld.size} van {velden.length} velden ingevuld · {aantalBeelden}{" "}
            beelden · laatst bewerkt {formatteerMoment(type.bijgewerkt_op)}
          </p>
        </div>
        <a
          href={`/admin/types/${type.sleutel}/voorbeeld`}
          target="_blank"
          rel="noopener"
          className="shrink-0 rounded-full bg-foreground px-5 py-2 text-center text-sm text-background hover:opacity-90"
        >
          Voorbeeld-PDF bekijken ↗
        </a>
      </div>

      <div className="rounded-xl bg-accent-zacht px-4 py-3 text-sm leading-relaxed">
        <p>
          <strong>Goed om te weten:</strong> wijzigingen gelden voor PDF&rsquo;s
          die vanaf nu worden gemaakt. PDF&rsquo;s die al zijn verstuurd,
          veranderen niet.
        </p>
        <p className="mt-1">
          Elk type heeft dezelfde vaste velden, in dezelfde volgorde als in de
          PDF. Sla elk veld op met de knop <em>Opslaan</em> onder dat veld. Met{" "}
          <em>Voorbeeld-PDF bekijken</em> zie je (in een nieuw tabblad) hoe de
          hand-out eruitziet met de opgeslagen tekst.
        </p>
      </div>

      {/* Algemene gegevens */}
      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Gegevens</h2>
        <ActieFormulier
          actie={slaTypeOp}
          bewaakWijzigingen
          className="grid gap-3 sm:grid-cols-2"
        >
          <Verborgen waarden={{ sleutel: type.sleutel }} />
          <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
            Titel
            <input
              name="titel"
              required
              defaultValue={type.titel}
              className={`${invoer} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Lengte (label)
            <input
              name="lengte_label"
              defaultValue={type.lengte_label ?? ""}
              className={`${invoer} font-normal`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Maat (label)
            <input
              name="maat_label"
              defaultValue={type.maat_label ?? ""}
              className={`${invoer} font-normal`}
            />
          </label>
          <div className="sm:col-span-2">
            <button className={hoofdKnop}>Gegevens opslaan</button>
          </div>
        </ActieFormulier>
      </section>

      {/* Inhoud */}
      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Inhoud</h2>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {velden.map((v) => {
            const sec = perVeld.get(v.sleutel);
            return (
              <li
                key={v.sleutel}
                className={sec ? "" : "text-black/40 dark:text-white/40"}
              >
                <a
                  href={`#veld-${v.sleutel}`}
                  className="underline-offset-4 hover:underline"
                >
                  {v.volgorde}. {v.kop}
                </a>
                <span className="text-xs">
                  {" "}
                  ·{" "}
                  {sec
                    ? `${sec.beelden.length} ${sec.beelden.length === 1 ? "beeld" : "beelden"}`
                    : "leeg"}
                </span>
              </li>
            );
          })}
        </ol>
        <details className="text-sm">
          <summary className="cursor-pointer text-black/70 dark:text-white/70">
            Hoe werkt de opmaak van de tekst?
          </summary>
          <div className="mt-2">
            <OpmaakUitleg />
          </div>
        </details>
      </section>

      {groepen.map((groep) => (
        <div key={groep} className="flex flex-col gap-4">
          <h2 className="mt-2 border-b border-black/10 pb-1 text-sm font-semibold uppercase tracking-widest text-accent dark:border-white/15">
            {groep}
          </h2>
          {velden
            .filter((v) => v.groep === groep)
            .map((v) => {
              const s = perVeld.get(v.sleutel);
              const hulp = v.hulptekst;
              if (!s) {
                return (
                  <section
                    key={v.sleutel}
                    id={`veld-${v.sleutel}`}
                    className="flex scroll-mt-6 flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-black/20 p-4 dark:border-white/25"
                  >
                    <div>
                      <h3 className="font-serif text-lg text-black/60 dark:text-white/60">
                        {v.kop}
                      </h3>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Nog leeg; komt niet in de PDF. {hulp}
                      </p>
                    </div>
                    <ActieFormulier actie={vulVeld}>
                      <Verborgen waarden={{ sleutel, veld: v.sleutel }} />
                      <button className={kleineKnop}>+ Tekst toevoegen</button>
                    </ActieFormulier>
                  </section>
                );
              }
              return (
                <div
                  key={v.sleutel}
                  id={`veld-${v.sleutel}`}
                  className="scroll-mt-6"
                >
                  <section
                    key={s.id}
                    id={`sectie-${s.id}`}
                    className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-serif text-xl">{s.kop}</h3>
                        {hulp && (
                          <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                            {hulp}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <ActieFormulier
                          actie={verwijderSectie}
                          stil
                          bevestig={`'${s.kop}' leegmaken in ${sleutel}?\n\nDe tekst en de beeldkoppelingen van dit veld gaan verloren. De beelden blijven in de beeldbank staan.`}
                        >
                          <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
                          <button
                            className={`${kleineKnop} hover:!border-red-600 hover:!text-red-700`}
                          >
                            Veld leegmaken
                          </button>
                        </ActieFormulier>
                      </div>
                    </div>

                    <ActieFormulier
                      actie={slaSectieOp}
                      bewaakWijzigingen
                      className="flex flex-col gap-3"
                    >
                      <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
                      <label className="flex flex-col gap-1 text-sm font-medium">
                        Tekst
                        <GroeiendTekstvak
                          name="tekst"
                          defaultValue={s.tekst}
                          rows={6}
                          className={`${invoer} resize-y font-normal leading-relaxed`}
                        />
                      </label>
                      <p className="text-xs text-black/50 dark:text-white/50">
                        Lege regel = nieuwe alinea · regel beginnen met &ldquo;-
                        &rdquo; = opsommingsteken · **vet** · *cursief*
                      </p>
                      <div>
                        <button className={hoofdKnop}>Opslaan</button>
                      </div>
                    </ActieFormulier>

                    <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
                      <h3 className="text-sm font-medium">
                        Beelden bij dit veld ({s.beelden.length})
                      </h3>
                      <p className="text-xs leading-relaxed text-black/50 dark:text-white/50">
                        Beelden staan in de centrale beeldbank. Bewerk of
                        vervang je een beeld daar, dan verandert het in{" "}
                        <strong>elke hand-out</strong> die dat beeld gebruikt.
                        &lsquo;Uit sectie halen&rsquo; haalt het alleen hier
                        weg.
                      </p>
                      <div className="flex flex-wrap items-stretch gap-3">
                        {s.beelden.map((b, j) => {
                          const waarden = {
                            sleutel,
                            sectie_id: s.id,
                            volgorde: b.volgorde,
                            beeld_id: b.beeld_id,
                          };
                          return (
                            <div
                              key={`${b.volgorde}-${b.beeld_id}`}
                              className="flex w-40 flex-col gap-1.5 rounded-xl border border-black/10 bg-background p-2 dark:border-white/15"
                            >
                              <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
                                {b.url ? (
                                  <img
                                    src={b.url}
                                    alt={b.naam ?? b.code}
                                    loading="lazy"
                                    className="max-h-full max-w-full object-contain"
                                  />
                                ) : (
                                  <span className="text-xs text-black/40">
                                    geen voorbeeld
                                  </span>
                                )}
                              </div>
                              <p className="text-xs">
                                <span className="font-medium">{b.code}</span>
                                {b.naam && (
                                  <span className="block break-all text-black/55 dark:text-white/55">
                                    {b.naam}
                                  </span>
                                )}
                              </p>
                              {b.bijschrift && (
                                <p
                                  className="line-clamp-2 text-xs italic text-black/55 dark:text-white/55"
                                  title={b.bijschrift}
                                >
                                  &ldquo;{b.bijschrift}&rdquo;
                                </p>
                              )}
                              <div className="mt-auto flex items-center gap-1">
                                <ActieFormulier actie={verplaatsBeeld} stil>
                                  <Verborgen
                                    waarden={{ ...waarden, richting: "links" }}
                                  />
                                  <button
                                    className={kleineKnop}
                                    disabled={j === 0}
                                    aria-label="Naar links"
                                    title="Naar links"
                                  >
                                    ←
                                  </button>
                                </ActieFormulier>
                                <ActieFormulier actie={verplaatsBeeld} stil>
                                  <Verborgen
                                    waarden={{ ...waarden, richting: "rechts" }}
                                  />
                                  <button
                                    className={kleineKnop}
                                    disabled={j === s.beelden.length - 1}
                                    aria-label="Naar rechts"
                                    title="Naar rechts"
                                  >
                                    →
                                  </button>
                                </ActieFormulier>
                                <ActieFormulier
                                  actie={verwijderBeeld}
                                  stil
                                  bevestig={`Beeld ${b.code} uit de sectie '${s.kop}' halen?\n\nHet beeld blijft in de beeldbank staan en in andere hand-outs.`}
                                >
                                  <Verborgen waarden={waarden} />
                                  <button
                                    className={`${kleineKnop} hover:!border-red-600 hover:!text-red-700`}
                                  >
                                    Uit sectie halen
                                  </button>
                                </ActieFormulier>
                              </div>
                              <Link
                                href={`/admin/beeldbank/${b.beeld_id}`}
                                className="text-xs text-accent underline-offset-4 hover:underline"
                              >
                                Bewerken/vervangen in beeldbank
                              </Link>
                            </div>
                          );
                        })}
                        <BeeldKiezer
                          sleutel={sleutel}
                          sectieId={s.id}
                          kop={s.kop}
                          aanwezig={s.beelden.map((b) => b.beeld_id)}
                        />
                      </div>
                    </div>

                    <KopieerSectie
                      sleutel={sleutel}
                      sectieId={s.id}
                      kop={s.kop}
                      categorie={type.categorie}
                      types={andereTypes}
                      letters={letters}
                    />
                  </section>
                </div>
              );
            })}
        </div>
      ))}

      {overige.length > 0 && (
        <div className="flex flex-col gap-4">
          <h2 className="mt-2 border-b border-black/10 pb-1 text-sm font-semibold uppercase tracking-widest text-accent dark:border-white/15">
            Overige secties (horen bij geen vast veld)
          </h2>
          {overige.map((s) => {
            const hulp: string | null = null;
            return (
              <section
                key={s.id}
                id={`sectie-${s.id}`}
                className="flex scroll-mt-6 flex-col gap-4 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-xl">{s.kop}</h3>
                    {hulp && (
                      <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                        {hulp}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ActieFormulier
                      actie={verwijderSectie}
                      stil
                      bevestig={`'${s.kop}' leegmaken in ${sleutel}?\n\nDe tekst en de beeldkoppelingen van dit veld gaan verloren. De beelden blijven in de beeldbank staan.`}
                    >
                      <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
                      <button
                        className={`${kleineKnop} hover:!border-red-600 hover:!text-red-700`}
                      >
                        Veld leegmaken
                      </button>
                    </ActieFormulier>
                  </div>
                </div>

                <ActieFormulier
                  actie={slaSectieOp}
                  bewaakWijzigingen
                  className="flex flex-col gap-3"
                >
                  <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Tekst
                    <GroeiendTekstvak
                      name="tekst"
                      defaultValue={s.tekst}
                      rows={6}
                      className={`${invoer} resize-y font-normal leading-relaxed`}
                    />
                  </label>
                  <p className="text-xs text-black/50 dark:text-white/50">
                    Lege regel = nieuwe alinea · regel beginnen met &ldquo;-
                    &rdquo; = opsommingsteken · **vet** · *cursief*
                  </p>
                  <div>
                    <button className={hoofdKnop}>Opslaan</button>
                  </div>
                </ActieFormulier>

                <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
                  <h3 className="text-sm font-medium">
                    Beelden bij dit veld ({s.beelden.length})
                  </h3>
                  <p className="text-xs leading-relaxed text-black/50 dark:text-white/50">
                    Beelden staan in de centrale beeldbank. Bewerk of vervang je
                    een beeld daar, dan verandert het in{" "}
                    <strong>elke hand-out</strong> die dat beeld gebruikt.
                    &lsquo;Uit sectie halen&rsquo; haalt het alleen hier weg.
                  </p>
                  <div className="flex flex-wrap items-stretch gap-3">
                    {s.beelden.map((b, j) => {
                      const waarden = {
                        sleutel,
                        sectie_id: s.id,
                        volgorde: b.volgorde,
                        beeld_id: b.beeld_id,
                      };
                      return (
                        <div
                          key={`${b.volgorde}-${b.beeld_id}`}
                          className="flex w-40 flex-col gap-1.5 rounded-xl border border-black/10 bg-background p-2 dark:border-white/15"
                        >
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
                            {b.url ? (
                              <img
                                src={b.url}
                                alt={b.naam ?? b.code}
                                loading="lazy"
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-xs text-black/40">
                                geen voorbeeld
                              </span>
                            )}
                          </div>
                          <p className="text-xs">
                            <span className="font-medium">{b.code}</span>
                            {b.naam && (
                              <span className="block break-all text-black/55 dark:text-white/55">
                                {b.naam}
                              </span>
                            )}
                          </p>
                          {b.bijschrift && (
                            <p
                              className="line-clamp-2 text-xs italic text-black/55 dark:text-white/55"
                              title={b.bijschrift}
                            >
                              &ldquo;{b.bijschrift}&rdquo;
                            </p>
                          )}
                          <div className="mt-auto flex items-center gap-1">
                            <ActieFormulier actie={verplaatsBeeld} stil>
                              <Verborgen
                                waarden={{ ...waarden, richting: "links" }}
                              />
                              <button
                                className={kleineKnop}
                                disabled={j === 0}
                                aria-label="Naar links"
                                title="Naar links"
                              >
                                ←
                              </button>
                            </ActieFormulier>
                            <ActieFormulier actie={verplaatsBeeld} stil>
                              <Verborgen
                                waarden={{ ...waarden, richting: "rechts" }}
                              />
                              <button
                                className={kleineKnop}
                                disabled={j === s.beelden.length - 1}
                                aria-label="Naar rechts"
                                title="Naar rechts"
                              >
                                →
                              </button>
                            </ActieFormulier>
                            <ActieFormulier
                              actie={verwijderBeeld}
                              stil
                              bevestig={`Beeld ${b.code} uit de sectie '${s.kop}' halen?\n\nHet beeld blijft in de beeldbank staan en in andere hand-outs.`}
                            >
                              <Verborgen waarden={waarden} />
                              <button
                                className={`${kleineKnop} hover:!border-red-600 hover:!text-red-700`}
                              >
                                Uit sectie halen
                              </button>
                            </ActieFormulier>
                          </div>
                          <Link
                            href={`/admin/beeldbank/${b.beeld_id}`}
                            className="text-xs text-accent underline-offset-4 hover:underline"
                          >
                            Bewerken/vervangen in beeldbank
                          </Link>
                        </div>
                      );
                    })}
                    <BeeldKiezer
                      sleutel={sleutel}
                      sectieId={s.id}
                      kop={s.kop}
                      aanwezig={s.beelden.map((b) => b.beeld_id)}
                    />
                  </div>
                </div>

                <KopieerSectie
                  sleutel={sleutel}
                  sectieId={s.id}
                  kop={s.kop}
                  categorie={type.categorie}
                  types={andereTypes}
                  letters={letters}
                />
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
