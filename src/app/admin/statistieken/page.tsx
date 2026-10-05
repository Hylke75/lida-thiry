import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { groeiReeks, nlDag, somLaatste, type ContactMoment } from "@/lib/nieuwsbrief/statistiek";
import {
  bepaalPeriode,
  berekenTrechter,
  berekenVerkoop,
  bestellingenPerDag,
  binnen,
  queryGrenzen,
  topFiguurtypes,
  VASTE_PERIODES,
  type Periode,
  type TrechterOrder,
} from "@/lib/statistiek/trechter";
import { adminClient } from "@/lib/supabase/admin";
import { AdminNav } from "../AdminNav";
import { Groeigrafiek } from "../nieuwsbrief/Groeigrafiek";
import { Balken, DagStaven, kortDatum, Trechter } from "./Grafieken";

export const dynamic = "force-dynamic";

type Supabase = ReturnType<typeof adminClient>;
type Zoek = { periode?: string; van?: string; tot?: string };
type OrderRij = TrechterOrder & { id: string; afgerond_op: string | null };

const BLOK = 1000;
const DAG_MS = 86_400_000;

/** Bestellingen die in (of rond) de periode zijn aangemaakt, betaald of afgerond. */
async function leesOrders(supabase: Supabase, p: Periode): Promise<OrderRij[]> {
  const { vanaf, totEnMet } = queryGrenzen(p);
  const uit: OrderRij[] = [];
  for (let start = 0; ; start += BLOK) {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, email, status, aangemaakt_op, betaald_op, afgerond_op, bedrag_cent, korting_cent, kortingscode, mollie_payment_id, toegekend_type",
      )
      .or(`aangemaakt_op.gte."${vanaf}",betaald_op.gte."${vanaf}",afgerond_op.gte."${vanaf}"`)
      .lt("aangemaakt_op", totEnMet)
      .order("id")
      .range(start, start + BLOK - 1);
    if (error) throw new Error(`orders lezen: ${error.message}`);
    uit.push(...((data ?? []) as OrderRij[]));
    if (!data || data.length < BLOK) return uit;
  }
}

/** Tijdstempels uit een tabel binnen de (ruime) periode, voor tellen per dag. */
async function momenten(
  supabase: Supabase,
  tabel: string,
  kolom: string,
  p: Periode,
  status: { gelijk?: string; niet?: string },
): Promise<string[]> {
  const { vanaf, totEnMet } = queryGrenzen(p);
  const uit: string[] = [];
  for (let start = 0; start < 20 * BLOK; start += BLOK) {
    let q = supabase.from(tabel).select(kolom).gte(kolom, vanaf).lt(kolom, totEnMet);
    if (status.gelijk) q = q.eq("status", status.gelijk);
    if (status.niet) q = q.neq("status", status.niet);
    const { data, error } = await q.order(kolom).range(start, start + BLOK - 1);
    if (error) throw new Error(`${tabel} lezen: ${error.message}`);
    const rijen = (data ?? []) as unknown as Record<string, string | null>[];
    uit.push(...rijen.map((r) => r[kolom]).filter((w): w is string => !!w && binnen(w, p)));
    if (rijen.length < BLOK) break;
  }
  return uit;
}

/** Nieuwsbriefcontacten die sinds `vanaf` aangemeld of vertrokken zijn (zoals op het nieuwsbriefoverzicht). */
async function contactMomenten(supabase: Supabase, vanaf: string): Promise<ContactMoment[]> {
  const uit: ContactMoment[] = [];
  for (let start = 0; ; start += BLOK) {
    const { data, error } = await supabase
      .from("nb_contacten")
      .select("status, bevestigd_op, afgemeld_op, bijgewerkt_op")
      .or(
        `bevestigd_op.gte."${vanaf}",afgemeld_op.gte."${vanaf}",and(status.in.(gebounced,klacht),bijgewerkt_op.gte."${vanaf}")`,
      )
      .order("id")
      .range(start, start + BLOK - 1);
    if (error) throw new Error(`contacten lezen: ${error.message}`);
    uit.push(...((data ?? []) as ContactMoment[]));
    if (!data || data.length < BLOK) return uit;
  }
}

async function laad(p: Periode) {
  const supabase = adminClient();
  const nu = new Date();
  // De groeireeks rekent terug vanaf vandaag; daarna knippen we de periode eruit.
  const dagenTotVandaag = Math.round((Date.parse(`${nlDag(nu)}T00:00:00Z`) - Date.parse(`${p.van}T00:00:00Z`)) / DAG_MS) + 1;
  const [orders, lichaamstypes, contactBerichten, blogs, aangemeld, nbMomenten] = await Promise.all([
    leesOrders(supabase, p),
    haalLichaamstypes().catch(() => []),
    momenten(supabase, "contact_berichten", "aangemaakt_op", p, { niet: "spam" }),
    momenten(supabase, "blog_berichten", "gepubliceerd_op", p, { gelijk: "gepubliceerd" }),
    supabase.from("nb_contacten").select("id", { count: "exact", head: true }).eq("status", "aangemeld"),
    contactMomenten(supabase, queryGrenzen(p).vanaf),
  ]);
  if (aangemeld.error) throw new Error(`contacten tellen: ${aangemeld.error.message}`);

  const rijen = orders;
  const namen = new Map(lichaamstypes.map((l) => [l.code, l.naam]));
  const groei = groeiReeks(aangemeld.count ?? 0, nbMomenten, dagenTotVandaag, nu).filter(
    (d) => d.datum >= p.van && d.datum <= p.tot,
  );

  return {
    trechter: berekenTrechter(rijen, p),
    verkoop: berekenVerkoop(rijen, p),
    perDag: bestellingenPerDag(rijen, p),
    top: topFiguurtypes(rijen, p).map((t) => ({ label: namen.get(t.code) ? `${t.code} · ${namen.get(t.code)}` : t.code, aantal: t.aantal })),
    groei,
    groeiSom: somLaatste(groei, groei.length),
    contact: contactBerichten.length,
    blogs: blogs.length,
  };
}

function euro(cent: number | null): string {
  if (cent == null) return "–";
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(cent / 100);
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

const kaartKlasse = "flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15";
const invoer =
  "rounded-lg border border-black/15 bg-kaart px-2 py-1 text-sm outline-none focus:border-accent dark:border-white/20";

export default async function Statistieken({ searchParams }: { searchParams: Promise<Zoek> }) {
  await vereisBeheerder("statistieken");
  const p = bepaalPeriode(await searchParams);
  const d = await laad(p);
  const knop = (actief: boolean) =>
    `rounded-full px-3 py-1 ${actief ? "bg-foreground text-background" : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"}`;
  const netto = d.groeiSom.nieuw - d.groeiSom.weg;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 sm:p-8">
      <AdminNav actief="/admin/statistieken" />

      <div className="flex flex-col gap-3">
        <h1 className="font-serif text-2xl">Statistieken</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Uit de eigen database, zonder testbestellingen. {kortDatum(p.van)} t/m {kortDatum(p.tot)} ({p.dagen}{" "}
          {p.dagen === 1 ? "dag" : "dagen"}).
        </p>
        <nav aria-label="Periode" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <div className="flex gap-1">
            {VASTE_PERIODES.map((n) => (
              <Link
                key={n}
                href={`/admin/statistieken?periode=${n}`}
                aria-current={p.sleutel === String(n) ? "page" : undefined}
                className={knop(p.sleutel === String(n))}
              >
                {n} dagen
              </Link>
            ))}
          </div>
          <form method="get" className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1">
              <span className="text-black/60 dark:text-white/60">Van</span>
              <input type="date" name="van" defaultValue={p.van} max={p.tot} required className={invoer} />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-black/60 dark:text-white/60">t/m</span>
              <input type="date" name="tot" defaultValue={p.tot} required className={invoer} />
            </label>
            <button type="submit" className={`${knop(p.sleutel === "eigen")} border border-black/15 dark:border-white/20`}>
              Toon
            </button>
          </form>
        </nav>
      </div>

      <section aria-labelledby="trechter-kop" className={kaartKlasse}>
        <h2 id="trechter-kop" className="text-lg">
          Conversietrechter
        </h2>
        <p className="text-xs text-black/55 dark:text-white/55">
          Bestellingen die in deze periode zijn aangemaakt, en hoe ver ze (tot nu toe) zijn gekomen. Of iemand de test al
          is begonnen, weten we pas bij het afronden; hoeveel mensen de test openen en beginnen, zie je in Vercel Web
          Analytics (gebeurtenis &lsquo;test gestart&rsquo;).
        </p>
        <Trechter stappen={d.trechter} />
      </section>

      <section aria-label="Verkoop" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kaart titel="Omzet" waarde={euro(d.verkoop.omzetCent)} sub={`${d.verkoop.betaald} betaalde bestellingen, na korting`} />
        <Kaart titel="Gem. orderwaarde" waarde={euro(d.verkoop.gemiddeldCent)} sub="per betaalde bestelling" />
        <Kaart
          titel="Met korting"
          waarde={d.verkoop.kortingPct == null ? "–" : `${d.verkoop.kortingPct.toLocaleString("nl-NL")}%`}
          sub={`${d.verkoop.metKorting} bestellingen, samen ${euro(d.verkoop.kortingCent)} korting`}
        />
        <Kaart
          titel="Nieuwsbrief"
          waarde={`${netto >= 0 ? "+" : "−"}${Math.abs(netto).toLocaleString("nl-NL")}`}
          sub={`${d.groeiSom.nieuw} nieuw, ${d.groeiSom.weg} vertrokken`}
        />
        <Kaart titel="Contactberichten" waarde={d.contact.toLocaleString("nl-NL")} sub="via het contactformulier (zonder spam)" />
        <Kaart titel="Blogberichten" waarde={d.blogs.toLocaleString("nl-NL")} sub="gepubliceerd in deze periode" />
      </section>

      <section className={kaartKlasse}>
        <DagStaven
          titel="Bestellingen aangemaakt per dag"
          eenheid="bestellingen"
          reeks={d.perDag.map((x) => ({ datum: x.datum, aantal: x.aangemaakt }))}
        />
      </section>
      <section className={kaartKlasse}>
        <DagStaven
          titel="Betaalde bestellingen per dag"
          eenheid="betaald"
          reeks={d.perDag.map((x) => ({ datum: x.datum, aantal: x.betaald }))}
        />
      </section>

      <section aria-labelledby="types-kop" className={kaartKlasse}>
        <h2 id="types-kop" className="text-lg">
          Meest voorkomende figuurtypes
        </h2>
        <Balken rijen={d.top} leeg="Nog geen afgeronde tests in deze periode." />
      </section>

      {d.groei.length >= 2 && (
        <section className={kaartKlasse}>
          <Groeigrafiek reeks={d.groei} />
        </section>
      )}

      <section aria-labelledby="bezoekers-kop" className={kaartKlasse}>
        <h2 id="bezoekers-kop" className="text-lg">
          Bezoekers
        </h2>
        <p className="text-sm text-black/70 dark:text-white/70">
          Bezoekersaantallen, populaire pagina&rsquo;s, herkomst en de gebeurtenissen (bestelling gestart, test gestart en
          afgerond, nieuwsbriefaanmelding, contactformulier) staan in Vercel Web Analytics; laadsnelheid in Speed
          Insights. Beide werken zonder cookies.
        </p>
        <p className="text-sm">
          <a
            href="https://vercel.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline underline-offset-4"
          >
            Open Vercel → je project → Analytics ↗
          </a>
        </p>
        <p className="text-xs text-black/55 dark:text-white/55">
          Zie je daar nog niets? Zet Web Analytics en Speed Insights eenmalig aan in het Vercel-dashboard (tabbladen
          Analytics en Speed Insights → Enable) en publiceer opnieuw.
        </p>
      </section>
    </main>
  );
}
