import Link from "next/link";
import { after } from "next/server";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { verwerkWachtrij } from "@/lib/nieuwsbrief/verzenden";
import {
  gemiddeldePercentages,
  groeiReeks,
  percentage,
  somLaatste,
  type CampagneCijfers,
  type ContactMoment,
} from "@/lib/nieuwsbrief/statistiek";
import { AdminNav } from "../AdminNav";
import { ActieFormulier } from "../types/ActieFormulier";
import { Groeigrafiek } from "./Groeigrafiek";
import { verwerkWachtrijNu } from "./acties";

export const dynamic = "force-dynamic";
// Ook de verzendronde na het laden (after) en de knop "Wachtrij nu verwerken"
// mogen zo lang duren.
export const maxDuration = 300;

const DAG_MS = 86_400_000;
const GRAFIEK_DAGEN = 90;

type Supabase = ReturnType<typeof adminClient>;

interface CampagneRij {
  id: string;
  naam: string;
  status: string;
  ingepland_op: string | null;
  gestart_op: string | null;
  verzonden_op: string | null;
  bijgewerkt_op: string;
}

interface AutoRij {
  id: string;
  naam: string;
  trigger: "aanmelding" | "advies" | null;
  vertraging_dagen: number;
}

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  ingepland: "Ingepland",
  bezig: "Wordt verzonden",
  verzonden: "Verzonden",
  gepauzeerd: "Gepauzeerd",
};

const datumTijd = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Amsterdam",
});

async function telAantal(q: PromiseLike<{ count: number | null; error: { message: string } | null }>): Promise<number> {
  const { count, error } = await q;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Contacten die in de grafiekperiode zijn aangemeld of vertrokken (in pagina's van 1000). */
async function contactMomenten(supabase: Supabase, vanaf: string): Promise<ContactMoment[]> {
  const uit: ContactMoment[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase
      .from("nb_contacten")
      .select("status, bevestigd_op, afgemeld_op, bijgewerkt_op")
      .or(
        `bevestigd_op.gte."${vanaf}",afgemeld_op.gte."${vanaf}",and(status.in.(gebounced,klacht),bijgewerkt_op.gte."${vanaf}")`,
      )
      .order("id")
      .range(van, van + 999);
    if (error) throw new Error(`contacten lezen: ${error.message}`);
    uit.push(...((data ?? []) as ContactMoment[]));
    if (!data || data.length < 1000) return uit;
  }
}

async function campagneCijfers(supabase: Supabase, id: string): Promise<CampagneCijfers> {
  const basis = () =>
    supabase.from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("campagne_id", id);
  const [verzonden, geopend, geklikt] = await Promise.all([
    telAantal(basis().eq("status", "verzonden")),
    telAantal(basis().eq("status", "verzonden").not("geopend_op", "is", null)),
    telAantal(basis().eq("status", "verzonden").not("geklikt_op", "is", null)),
  ]);
  return { verzonden, geopend, geklikt };
}

function Kaart({ titel, waarde, sub }: { titel: string; waarde: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15">
      <span className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">{titel}</span>
      <span className="font-serif text-3xl tabular-nums">{waarde}</span>
      <span className="text-xs text-black/50 dark:text-white/50">{sub}</span>
    </div>
  );
}

function pct(w: number | null): string {
  return w == null ? "–" : `${w.toLocaleString("nl-NL")}%`;
}

function triggerTekst(a: AutoRij): string {
  const wanneer =
    a.vertraging_dagen === 0 ? "direct" : `${a.vertraging_dagen} ${a.vertraging_dagen === 1 ? "dag" : "dagen"}`;
  if (a.trigger === "aanmelding") return `${wanneer} na aanmelding`;
  if (a.trigger === "advies") return `${wanneer} na het advies`;
  return wanneer;
}

/** Alle cijfers voor het overzicht. */
async function laadOverzicht() {
  const supabase = adminClient();
  const nu = Date.now();
  const grafiekVanaf = new Date(nu - GRAFIEK_DAGEN * DAG_MS).toISOString();
  const etmaal = new Date(nu - DAG_MS).toISOString();

  const [aangemeld, momenten, recent, verzondenCampagnes, autos, wachtrij, verzonden24u, mislukt, maxPerDagTekst] =
    await Promise.all([
      telAantal(supabase.from("nb_contacten").select("id", { count: "exact", head: true }).eq("status", "aangemeld")),
      contactMomenten(supabase, grafiekVanaf),
      supabase
        .from("nb_campagnes")
        .select("id, naam, status, ingepland_op, gestart_op, verzonden_op, bijgewerkt_op")
        .eq("soort", "campagne")
        .order("bijgewerkt_op", { ascending: false })
        .limit(6),
      supabase
        .from("nb_campagnes")
        .select("id")
        .eq("soort", "campagne")
        .in("status", ["bezig", "verzonden"])
        .order("gestart_op", { ascending: false, nullsFirst: false })
        .limit(5),
      supabase
        .from("nb_campagnes")
        .select("id, naam, trigger, vertraging_dagen")
        .eq("soort", "automatisch")
        .eq("actief", true)
        .order("naam"),
      telAantal(
        supabase
          .from("nb_verzendingen")
          .select("id", { count: "exact", head: true })
          .in("status", ["wachtrij", "verwerken"]),
      ),
      telAantal(
        supabase
          .from("nb_verzendingen")
          .select("id", { count: "exact", head: true })
          .eq("status", "verzonden")
          .gte("verzonden_op", etmaal),
      ),
      telAantal(supabase.from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("status", "mislukt")),
      leesInstelling("nb_max_per_dag"),
    ]);
  if (recent.error) throw new Error(`campagnes lezen: ${recent.error.message}`);
  if (verzondenCampagnes.error) throw new Error(`campagnes lezen: ${verzondenCampagnes.error.message}`);
  if (autos.error) throw new Error(`automatische mails lezen: ${autos.error.message}`);

  const recenteCampagnes = (recent.data ?? []) as CampagneRij[];
  const actieveAutos = (autos.data ?? []) as AutoRij[];

  // Cijfers per campagne: de laatste 5 verzonden (KPI) en de recente lijst.
  const cijferIds = [
    ...new Set([...(verzondenCampagnes.data ?? []).map((c) => c.id as string), ...recenteCampagnes.map((c) => c.id)]),
  ];
  const cijfers = new Map(
    await Promise.all(cijferIds.map(async (id) => [id, await campagneCijfers(supabase, id)] as const)),
  );
  const autoCijfers = new Map(
    await Promise.all(actieveAutos.map(async (a) => [a.id, await campagneCijfers(supabase, a.id)] as const)),
  );
  const gemiddeld = gemiddeldePercentages(
    (verzondenCampagnes.data ?? []).map((c) => cijfers.get(c.id as string)).filter((c): c is CampagneCijfers => !!c),
  );

  const reeks = groeiReeks(aangemeld, momenten, GRAFIEK_DAGEN, new Date(nu));
  const dertig = somLaatste(reeks, 30);
  const netto = dertig.nieuw - dertig.weg;
  const maxPerDag = Number(maxPerDagTekst) > 0 ? Math.floor(Number(maxPerDagTekst)) : 100;
  const ruimte = Math.max(0, maxPerDag - verzonden24u);
  const aantalCampagnesVoorGemiddelde = (verzondenCampagnes.data ?? []).length;

  return {
    aangemeld,
    reeks,
    dertig,
    netto,
    gemiddeld,
    aantalCampagnesVoorGemiddelde,
    recenteCampagnes,
    cijfers,
    actieveAutos,
    autoCijfers,
    wachtrij,
    verzonden24u,
    mislukt,
    maxPerDag,
    ruimte,
  };
}

export default async function NieuwsbriefOverzicht() {
  await vereisBeheerder("nieuwsbrief");

  // Wachtrij op de achtergrond bijwerken terwijl de beheerder actief is: ingeplande
  // campagnes en automatische mails hoeven dan niet op de dagelijkse ronde te wachten.
  after(async () => {
    try {
      await verwerkWachtrij({ max: 200 });
    } catch (e) {
      console.error("Wachtrij verwerken (na openen overzicht) mislukt", e);
    }
  });

  const {
    aangemeld,
    reeks,
    dertig,
    netto,
    gemiddeld,
    aantalCampagnesVoorGemiddelde,
    recenteCampagnes,
    cijfers,
    actieveAutos,
    autoCijfers,
    wachtrij,
    verzonden24u,
    mislukt,
    maxPerDag,
    ruimte,
  } = await laadOverzicht();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 sm:p-8">
      <AdminNav actief="/admin/nieuwsbrief" />

      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Nieuwsbrief</h1>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/admin/nieuwsbrief/campagnes"
            className="rounded-full bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
          >
            Nieuwe campagne
          </Link>
          <Link
            href="/admin/nieuwsbrief/contacten"
            className="rounded-full border border-black/15 px-4 py-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Contacten
          </Link>
          <Link
            href="/admin/nieuwsbrief/automatisch"
            className="rounded-full border border-black/15 px-4 py-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Automatische mails
          </Link>
          <Link
            href="/admin/nieuwsbrief/afleverbaarheid"
            className="rounded-full border border-black/15 px-4 py-2 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
          >
            Afleverbaarheid
          </Link>
        </div>
      </div>

      <section aria-label="Kerncijfers" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kaart
          titel="Aangemeld"
          waarde={aangemeld.toLocaleString("nl-NL")}
          sub="contacten die de nieuwsbrief krijgen"
        />
        <Kaart
          titel="Groei 30 dagen"
          waarde={`${netto >= 0 ? "+" : "−"}${Math.abs(netto).toLocaleString("nl-NL")}`}
          sub={`${dertig.nieuw} nieuw, ${dertig.weg} vertrokken`}
        />
        <Kaart
          titel="Afmeldingen"
          waarde={dertig.weg.toLocaleString("nl-NL")}
          sub="laatste 30 dagen, incl. bounces en klachten"
        />
        <Kaart
          titel="Open / klik"
          waarde={gemiddeld.open == null ? "–" : `${pct(gemiddeld.open)}`}
          sub={
            gemiddeld.open == null
              ? "nog geen verzonden campagnes"
              : `geopend; ${pct(gemiddeld.klik)} klikte (gem. laatste ${aantalCampagnesVoorGemiddelde} ${
                  aantalCampagnesVoorGemiddelde === 1 ? "campagne" : "campagnes"
                })`
          }
        />
      </section>

      <section className="rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15">
        <Groeigrafiek reeks={reeks} />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Recente campagnes</h2>
          <Link href="/admin/nieuwsbrief/campagnes" className="text-sm text-accent underline underline-offset-4">
            Alle campagnes →
          </Link>
        </div>
        {recenteCampagnes.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Nog geen campagnes.{" "}
            <Link href="/admin/nieuwsbrief/campagnes" className="text-accent underline underline-offset-2">
              Maak je eerste nieuwsbrief
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recenteCampagnes.map((c) => {
              const cf = cijfers.get(c.id);
              const toonCijfers = cf && cf.verzonden > 0;
              const moment =
                c.status === "ingepland" && c.ingepland_op
                  ? `gepland ${datumTijd.format(new Date(c.ingepland_op))}`
                  : c.verzonden_op
                    ? datumTijd.format(new Date(c.verzonden_op))
                    : c.gestart_op
                      ? `gestart ${datumTijd.format(new Date(c.gestart_op))}`
                      : `bewerkt ${datumTijd.format(new Date(c.bijgewerkt_op))}`;
              return (
                <li key={c.id}>
                  <Link
                    href={`/admin/nieuwsbrief/campagnes/${c.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-black/10 bg-kaart px-4 py-3 text-sm hover:border-accent/40 dark:border-white/15"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{c.naam}</span>
                      <span className="text-xs text-black/50 dark:text-white/50">
                        {STATUS_LABEL[c.status] ?? c.status} · {moment}
                      </span>
                    </span>
                    {toonCijfers && (
                      <span className="tabular-nums text-black/60 dark:text-white/60">
                        {cf.verzonden} verzonden · {pct(percentage(cf.geopend, cf.verzonden))} geopend ·{" "}
                        {pct(percentage(cf.geklikt, cf.verzonden))} geklikt
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Actieve automatische mails</h2>
          <Link href="/admin/nieuwsbrief/automatisch" className="text-sm text-accent underline underline-offset-4">
            Alle automatische mails →
          </Link>
        </div>
        {actieveAutos.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            Er staat geen automatische mail aan (bijvoorbeeld een welkomstmail na aanmelding).
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {actieveAutos.map((a) => {
              const cf = autoCijfers.get(a.id);
              return (
                <li key={a.id}>
                  <Link
                    href={`/admin/nieuwsbrief/automatisch/${a.id}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border border-black/10 bg-kaart px-4 py-3 text-sm hover:border-accent/40 dark:border-white/15"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{a.naam}</span>
                      <span className="text-xs text-black/50 dark:text-white/50">{triggerTekst(a)}</span>
                    </span>
                    {cf && cf.verzonden > 0 && (
                      <span className="tabular-nums text-black/60 dark:text-white/60">
                        {cf.verzonden} verzonden · {pct(percentage(cf.geopend, cf.verzonden))} geopend
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="wachtrij-kop"
        className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15"
      >
        <h2 id="wachtrij-kop" className="text-lg">
          Verzenden
        </h2>
        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">In de wachtrij</dt>
            <dd className="font-serif text-2xl tabular-nums">{wachtrij.toLocaleString("nl-NL")}</dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">Laatste 24 uur</dt>
            <dd className="font-serif text-2xl tabular-nums">
              {verzonden24u.toLocaleString("nl-NL")}
              <span className="font-sans text-sm text-black/50 dark:text-white/50"> / {maxPerDag} per dag</span>
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="text-xs uppercase tracking-wide text-black/50 dark:text-white/50">Mislukt</dt>
            <dd className={`font-serif text-2xl tabular-nums ${mislukt > 0 ? "text-red-700 dark:text-red-300" : ""}`}>
              {mislukt.toLocaleString("nl-NL")}
            </dd>
          </div>
        </dl>
        {verzonden24u >= maxPerDag && wachtrij > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            De daglimiet van {maxPerDag} mails is bereikt. De wachtrij gaat verder zodra er weer ruimte is (de limiet
            telt over de afgelopen 24 uur).
          </p>
        )}
        {mislukt > 0 && (
          <p className="text-sm text-black/60 dark:text-white/60">
            Bij de campagne zie je wat er misging; daar kun je mislukte mails opnieuw in de wachtrij zetten.
          </p>
        )}

        <ActieFormulier actie={verwerkWachtrijNu} className="flex flex-wrap items-center gap-3">
          <button className="rounded-full border border-accent/40 px-4 py-2 text-sm font-medium text-accent hover:bg-accent-zacht disabled:opacity-50">
            Wachtrij nu verwerken
          </button>
          <span className="text-xs text-black/50 dark:text-white/50">
            Verstuurt nu maximaal {Math.min(300, ruimte)} mails (ruimte binnen de daglimiet).
          </span>
        </ActieFormulier>

        <details className="text-sm">
          <summary className="cursor-pointer text-black/60 dark:text-white/60">Wanneer worden mails verstuurd?</summary>
          <div className="mt-2 flex flex-col gap-2 text-black/70 dark:text-white/70">
            <p>
              De site draait op een abonnement dat maar één automatische taak per dag toestaat. Daarom gaan mails op
              drie momenten de deur uit:
            </p>
            <ul className="list-disc pl-5">
              <li>
                <strong>Elke ochtend rond 9:00</strong> (8:00 in de winter) verwerkt een vaste ronde de hele wachtrij:
                ingeplande campagnes worden gestart en automatische mails ingepland en verstuurd.
              </li>
              <li>
                <strong>Als je dit overzicht opent</strong>, wordt de wachtrij op de achtergrond bijgewerkt. Zolang jij
                in het beheer bezig bent, hoeft niets op de ochtendronde te wachten.
              </li>
              <li>
                <strong>Direct na &ldquo;Nu verzenden&rdquo;</strong> bij een campagne, of met de knop hierboven.
              </li>
            </ul>
            <p>
              Een campagne die je inplant voor 14:00 gaat dus uiterlijk de volgende ochtend weg, of eerder als je
              tussendoor het beheer opent. Een welkomstmail na aanmelding komt op dezelfde manier binnen een dag aan. Er
              gaan nooit meer dan {maxPerDag} mails per 24 uur uit (instelling &ldquo;maximaal aantal mails per
              dag&rdquo;); de rest volgt bij een volgende ronde.
            </p>
          </div>
        </details>
      </section>
    </main>
  );
}
