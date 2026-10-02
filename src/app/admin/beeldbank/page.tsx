import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls, gebruiksAantallen } from "@/lib/beeldbank";
import { ONDERDELEN, isTeKlein, verhoudingLabel } from "@/lib/beeldbank-regels";
import {
  STATUSSEN,
  STATUS_LABELS,
  afmetingTekst,
  filterBeelden,
  filterHref,
  leesFilters,
  pagineer,
  tellers,
  type LijstBeeld,
} from "@/lib/beeldbank-beheer";
import { AdminNav, Melding } from "../AdminNav";
import { BeeldUpload } from "./BeeldUpload";
import { bepaalAfmetingen } from "./acties";
import { StatusBadge, TeKleinBadge } from "./badges";

export const dynamic = "force-dynamic";
// Afmetingen bepalen en uploads verwerken (sharp) kan even duren.
export const maxDuration = 120;

interface Rij extends LijstBeeld {
  pad: string;
  thumb_pad: string | null;
  verhouding_b: number | null;
  verhouding_h: number | null;
}

const LIJST_KOLOMMEN =
  "id, code, naam, onderdeel, omschrijving, bijschrift, status, pad, thumb_pad, breedte, hoogte, verhouding_b, verhouding_h, min_breedte, min_hoogte";

/** Alle beelden (lichte kolommen; PostgREST geeft maximaal 1000 rijen per keer). */
async function leesAlleBeelden(): Promise<Rij[]> {
  const supabase = adminClient();
  const rijen: Rij[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase
      .from("beelden")
      .select(LIJST_KOLOMMEN)
      .order("code")
      .range(van, van + 999);
    if (error) throw new Error(`beelden lezen: ${error.message}`);
    rijen.push(...((data ?? []) as Rij[]));
    if (!data || data.length < 1000) break;
  }
  return rijen;
}

const invoerKlasse =
  "rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";

function Teller({ label, waarde, href }: { label: string; waarde: number; href?: string }) {
  const inhoud = (
    <>
      <span className="text-2xl font-semibold tabular-nums">{waarde}</span>
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
    </>
  );
  const klasse = "flex flex-col rounded-xl border border-black/10 bg-kaart px-4 py-3 dark:border-white/15";
  return href ? (
    <Link href={href} className={`${klasse} hover:border-accent`}>
      {inhoud}
    </Link>
  ) : (
    <div className={klasse}>{inhoud}</div>
  );
}

function Werkwijze() {
  return (
    <details className="rounded-2xl border border-black/10 bg-kaart p-5 text-sm dark:border-white/15">
      <summary className="cursor-pointer font-medium">Werkwijze: zo houd je de beeldbank netjes</summary>
      <div className="mt-4 flex flex-col gap-4 leading-relaxed text-black/75 dark:text-white/75">
        <section>
          <h3 className="font-medium text-black dark:text-white">Naamgeving</h3>
          <p>
            Geef elk beeld een naam in de vorm <code className="rounded bg-accent-zacht px-1">onderdeel-omschrijving-figuur-advies</code>.
            Het figuur laat je weg als het beeld voor alle figuren geldt. Alleen kleine letters, cijfers en streepjes.
          </p>
          <ul className="mt-1 list-disc pl-5">
            <li>
              <code>tops-v-hals-goed</code> — een top met V-hals, goed voor iedereen
            </li>
            <li>
              <code>rokken-a-lijn-a-vermijd</code> — een A-lijnrok, te vermijden bij figuur A
            </li>
          </ul>
          <p className="mt-1">
            Twijfel je? Vul onderdeel, omschrijving, figuur en advies in en klik op ‘Naam voorstellen’.
          </p>
        </section>
        <section>
          <h3 className="font-medium text-black dark:text-white">Tekenstijl</h3>
          <ul className="list-disc pl-5">
            <li>Gebruik per verhouding steeds hetzelfde canvas (bijvoorbeeld altijd 1200 × 1600 px voor 3:4).</li>
            <li>Een witte of transparante achtergrond.</li>
            <li>Lijnen in antraciet (donkergrijs), even dik in alle tekeningen.</li>
          </ul>
        </section>
        <section>
          <h3 className="font-medium text-black dark:text-white">In de PDF</h3>
          <p>
            In het advies staat een beeld ongeveer 4 cm breed. Lever beelden daarom liefst op twee keer het
            minimale formaat aan; dan blijven ze ook geprint haarscherp.
          </p>
        </section>
        <section>
          <h3 className="font-medium text-black dark:text-white">Vervangen</h3>
          <p>
            Elk beeld staat maar één keer in de beeldbank. Vervang je het, dan krijgen alle adviestypes waarin het
            gebruikt wordt automatisch het nieuwe beeld. Ging er iets mis, dan kun je de vorige versie terugzetten.
          </p>
        </section>
      </div>
    </details>
  );
}

export default async function BeeldbankPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder();
  const sp = await searchParams;
  const filters = leesFilters(sp);
  const [alle, gebruik] = await Promise.all([leesAlleBeelden(), gebruiksAantallen()]);

  const telling = tellers(alle);
  const gefilterd = filterBeelden(alle, filters, gebruik);
  const { items, pagina, aantalPaginas } = pagineer(gefilterd, filters.pagina);
  const urls = await beeldUrls(items.map((b) => b.thumb_pad ?? b.pad));

  const onbekendeOnderdelen = [...new Set(alle.map((b) => b.onderdeel).filter((o): o is string => Boolean(o)))]
    .filter((o) => !(ONDERDELEN as readonly string[]).includes(o))
    .sort();
  const filtersActief =
    filters.zoek || filters.onderdeel || filters.status || filters.teKlein || filters.ongebruikt;

  const bepaald = typeof sp.bepaald === "string" ? Number(sp.bepaald) : null;
  const open = typeof sp.open === "string" ? Number(sp.open) : null;
  const verwijderd = typeof sp.verwijderd === "string" ? sp.verwijderd : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/beeldbank" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Beeldbank</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Alle tekeningen uit de adviezen staan hier één keer. Klik op een beeld om de gegevens aan te passen of
            het te vervangen; de nieuwe versie verschijnt dan automatisch in alle adviestypes waarin het gebruikt
            wordt.
          </p>
        </div>
        <BeeldUpload beeldId={null} eisen={null} label="Nieuw beeld toevoegen" />
      </div>

      {verwijderd && <Melding soort="ok">Beeld {verwijderd} is verwijderd.</Melding>}
      {bepaald != null && open != null && (
        <Melding soort="ok">
          Van {bepaald} beelden zijn de afmetingen bepaald.{" "}
          {open > 0 ? `Er zijn er nog ${open} te gaan; klik nog een keer op de knop.` : "Alle afmetingen zijn nu bekend."}
        </Melding>
      )}

      {telling.zonderAfmetingen > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-medium">Van {telling.zonderAfmetingen} beelden zijn de afmetingen nog niet bepaald.</span>{" "}
            Daardoor weten we nog niet of ze groot genoeg zijn. Klik op de knop; elke klik verwerkt maximaal 150
            beelden (dat duurt even).
          </p>
          <form action={bepaalAfmetingen}>
            <button className="whitespace-nowrap rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
              Afmetingen bepalen
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Teller label="beelden in totaal" waarde={telling.totaal} href="/admin/beeldbank" />
        <Teller label="te klein" waarde={telling.teKlein} href={filterHref(leesFilters({}), { teKlein: true })} />
        <Teller label="nog geen naam" waarde={telling.zonderNaam} />
        <Teller
          label="goedgekeurd"
          waarde={telling.goedgekeurd}
          href={filterHref(leesFilters({}), { status: "goedgekeurd" })}
        />
      </div>

      <Werkwijze />

      <form
        method="get"
        action="/admin/beeldbank"
        className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15"
      >
        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
          <label className="flex flex-col gap-1 text-xs font-medium">
            Zoeken
            <input
              name="zoek"
              defaultValue={filters.zoek}
              placeholder="Nummer, naam, omschrijving of bijschrift"
              className={invoerKlasse}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Onderdeel
            <select name="onderdeel" defaultValue={filters.onderdeel} className={invoerKlasse}>
              <option value="">Alle onderdelen</option>
              {ONDERDELEN.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              {onbekendeOnderdelen.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
              <option value="-">(geen onderdeel)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Status
            <select name="status" defaultValue={filters.status} className={invoerKlasse}>
              <option value="">Alle statussen</option>
              {STATUSSEN.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="teklein" value="1" defaultChecked={filters.teKlein} className="accent-accent" />
            Alleen te kleine beelden
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="ongebruikt"
              value="1"
              defaultChecked={filters.ongebruikt}
              className="accent-accent"
            />
            Alleen beelden die nergens gebruikt worden
          </label>
          <div className="flex items-center gap-3 sm:ml-auto">
            {filtersActief && (
              <Link href="/admin/beeldbank" className="text-black/60 underline underline-offset-4 dark:text-white/60">
                Filters wissen
              </Link>
            )}
            <button className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90">
              Zoeken
            </button>
          </div>
        </div>
      </form>

      <p className="text-sm text-black/60 dark:text-white/60">
        {gefilterd.length === alle.length
          ? `${alle.length} beelden`
          : `${gefilterd.length} van de ${alle.length} beelden gevonden`}
        {aantalPaginas > 1 && ` · pagina ${pagina} van ${aantalPaginas}`}
      </p>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-black/15 p-8 text-center text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          Geen beelden gevonden. Pas de zoekopdracht aan of{" "}
          <Link href="/admin/beeldbank" className="underline underline-offset-4">
            wis de filters
          </Link>
          .
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((b) => {
            const url = urls[b.thumb_pad ?? b.pad];
            const aantal = gebruik[b.id] ?? 0;
            return (
              <li key={b.id}>
                <Link
                  href={`/admin/beeldbank/${b.id}`}
                  className="flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-kaart hover:border-accent dark:border-white/15"
                >
                  <div className="flex aspect-square items-center justify-center bg-white p-2">
                    {url ? (
                      // eslint-disable-next-line @next/next/no-img-element -- tijdelijke signed URL
                      <img src={url} alt={b.naam ?? b.code} loading="lazy" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-black/40">Geen voorbeeld</span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1 p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-medium">{b.code}</span>
                      <StatusBadge status={b.status} />
                    </div>
                    <span className={`break-all ${b.naam ? "font-medium" : "italic text-black/45 dark:text-white/45"}`}>
                      {b.naam ?? "(nog geen naam)"}
                    </span>
                    {b.onderdeel && <span className="text-black/60 dark:text-white/60">{b.onderdeel}</span>}
                    <span className="text-black/60 dark:text-white/60">
                      {b.verhouding_b && b.verhouding_h ? verhoudingLabel(b.verhouding_b, b.verhouding_h) : "verhouding onbekend"}
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5 text-black/60 dark:text-white/60">
                      {afmetingTekst(b.breedte, b.hoogte)}
                      {isTeKlein(b) && <TeKleinBadge />}
                    </span>
                    <span className={`mt-auto pt-1 ${aantal === 0 ? "text-black/45 dark:text-white/45" : ""}`}>
                      {aantal === 0 ? "nergens gebruikt" : `gebruikt in ${aantal} ${aantal === 1 ? "sectie" : "secties"}`}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {aantalPaginas > 1 && (
        <nav aria-label="Pagina's" className="flex items-center justify-center gap-3 text-sm">
          {pagina > 1 ? (
            <Link href={filterHref(filters, { pagina: pagina - 1 })} className="rounded-full border border-black/15 px-4 py-1.5 hover:border-accent dark:border-white/20">
              ← Vorige
            </Link>
          ) : (
            <span className="rounded-full border border-black/5 px-4 py-1.5 text-black/30 dark:border-white/10 dark:text-white/30">← Vorige</span>
          )}
          <span className="tabular-nums">
            {pagina} / {aantalPaginas}
          </span>
          {pagina < aantalPaginas ? (
            <Link href={filterHref(filters, { pagina: pagina + 1 })} className="rounded-full border border-black/15 px-4 py-1.5 hover:border-accent dark:border-white/20">
              Volgende →
            </Link>
          ) : (
            <span className="rounded-full border border-black/5 px-4 py-1.5 text-black/30 dark:border-white/10 dark:text-white/30">Volgende →</span>
          )}
        </nav>
      )}
    </main>
  );
}
