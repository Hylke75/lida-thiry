import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { haalCampagne } from "@/lib/nieuwsbrief/verzenden";
import {
  ONTVANGER_FILTERS,
  VERZEND_STATUS_LABEL,
  leesFilter,
  toonPercentage,
  veiligeZoekterm,
  type OntvangerFilter,
} from "@/lib/nieuwsbrief/rapport";
import { kliksPerLink, statistiekPerCampagne } from "@/lib/nieuwsbrief/statistiek";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { Melding } from "../../../../AdminNav";
import { NieuwsbriefKop, StatusBadge } from "../../../_editor/onderdelen";
import { invoerKlasse, kaart, knopKlein, knopRand, zacht } from "../../../_editor/stijl";
import { probeerOpnieuw } from "../../acties";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PER_PAGINA = 50;

interface Ontvanger {
  id: string;
  email: string;
  status: string;
  fout: string | null;
  verzonden_op: string | null;
  geopend_op: string | null;
  aantal_geopend: number;
  geklikt_op: string | null;
  aantal_kliks: number;
  afgemeld_op: string | null;
  gebounced_op: string | null;
}

type Zoek = { q?: string; filter?: string; pagina?: string; opnieuw?: string };

function Cijfer({ label, waarde, van, uitleg }: { label: string; waarde: number; van?: number; uitleg?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-black/10 p-3 dark:border-white/15">
      <dt className={`text-xs ${zacht}`}>{label}</dt>
      <dd className="text-xl font-semibold">
        {waarde.toLocaleString("nl-NL")}
        {van !== undefined && <span className={`ml-1.5 text-sm font-normal ${zacht}`}>{toonPercentage(waarde, van)}</span>}
      </dd>
      {uitleg && <p className={`text-xs ${zacht}`}>{uitleg}</p>}
    </div>
  );
}

export default async function RapportPagina({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Zoek> }) {
  await vereisBeheerder();
  const { id } = await params;
  const zoek = await searchParams;
  if (!UUID_PATROON.test(id)) notFound();
  const c = await haalCampagne(id);
  if (!c) notFound();

  const filter = leesFilter(zoek.filter);
  const q = veiligeZoekterm(zoek.q);
  const pagina = Math.max(1, Math.floor(Number(zoek.pagina)) || 1);
  const basis = c.soort === "automatisch" ? `/admin/nieuwsbrief/automatisch/${id}` : `/admin/nieuwsbrief/campagnes/${id}`;
  const pad = `/admin/nieuwsbrief/campagnes/${id}/rapport`;
  const link = (w: Partial<Zoek>) => {
    const p = new URLSearchParams();
    const alles: Zoek = { q: q || undefined, filter: filter === "alle" ? undefined : filter, ...w };
    for (const [k, v] of Object.entries(alles)) if (v && k !== "opnieuw") p.set(k, v);
    const s = p.toString();
    return s ? `${pad}?${s}` : pad;
  };

  let query = adminClient()
    .from("nb_verzendingen")
    .select("id, email, status, fout, verzonden_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, afgemeld_op, gebounced_op", {
      count: "exact",
    })
    .eq("campagne_id", id);
  const filters: Record<OntvangerFilter, (qq: typeof query) => typeof query> = {
    alle: (qq) => qq,
    geopend: (qq) => qq.not("geopend_op", "is", null),
    geklikt: (qq) => qq.not("geklikt_op", "is", null),
    niet_geopend: (qq) => qq.eq("status", "verzonden").is("geopend_op", null),
    mislukt: (qq) => qq.eq("status", "mislukt"),
    afgemeld: (qq) => qq.not("afgemeld_op", "is", null),
    wachtrij: (qq) => qq.in("status", ["wachtrij", "verwerken"]),
  };
  query = filters[filter](query);
  if (q) query = query.ilike("email", `%${q}%`);
  const van = (pagina - 1) * PER_PAGINA;
  const [{ data: rijen, count }, stats, links] = await Promise.all([
    query.order("email").range(van, van + PER_PAGINA - 1),
    statistiekPerCampagne([id]),
    kliksPerLink(id),
  ]);
  const t = stats.get(id)!;
  const ontvangers = (rijen ?? []) as Ontvanger[];
  const paginas = Math.max(1, Math.ceil((count ?? 0) / PER_PAGINA));
  const opnieuw = zoek.opnieuw !== undefined ? Number(zoek.opnieuw) : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <NieuwsbriefKop
        pad={
          c.soort === "automatisch"
            ? [{ href: "/admin/nieuwsbrief/automatisch", label: "Automatische mails" }, { href: basis, label: c.naam }, { label: "Rapport" }]
            : [{ href: "/admin/nieuwsbrief/campagnes", label: "Campagnes" }, { href: basis, label: c.naam }, { label: "Rapport" }]
        }
      />
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">Rapport: {c.naam}</h1>
          {c.soort === "campagne" && <StatusBadge status={c.status} />}
        </div>
        <p className={`break-words text-sm ${zacht}`}>
          {c.onderwerp}
          {c.soort === "campagne" && (c.verzonden_op || c.gestart_op) && ` · ${c.verzonden_op ? "verzonden" : "gestart"} ${toonDatumTijd(c.verzonden_op ?? c.gestart_op)}`}
        </p>
      </div>

      {opnieuw !== null &&
        (opnieuw > 0 ? (
          <Melding soort="ok">{opnieuw === 1 ? "1 mislukte mail staat" : `${opnieuw} mislukte mails staan`} weer in de wachtrij.</Melding>
        ) : (
          <Melding soort="fout">Er waren geen mislukte mails om opnieuw te proberen.</Melding>
        ))}

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Resultaten</h2>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Cijfer label="Verzonden" waarde={t.verzonden} />
          <Cijfer label="Geopend (uniek)" waarde={t.geopend} van={t.verzonden} />
          <Cijfer label="Geklikt (uniek)" waarde={t.geklikt} van={t.verzonden} />
          <Cijfer label="Afgemeld" waarde={t.afgemeld} van={t.verzonden} />
          <Cijfer label="Nog in de wachtrij" waarde={t.wachtrij} />
          <Cijfer label="Mislukt" waarde={t.mislukt} />
          <Cijfer label="Overgeslagen" waarde={t.overgeslagen} uitleg="Afgemeld vóór het versturen." />
          <Cijfer label="Onbestelbaar" waarde={t.gebounced} van={t.verzonden} />
        </dl>
        <p className={`text-xs ${zacht}`}>
          Percentages zijn ten opzichte van het aantal verzonden mails. Openen wordt niet altijd gemeten (veel
          mailprogramma&apos;s laden afbeeldingen niet automatisch), dus het echte aantal ligt vaak hoger. Een klik telt
          ook als geopend.
          {t.wachtrij > 0 && " Mails in de wachtrij gaan vanzelf de deur uit binnen de daglimiet."}
        </p>
        {t.mislukt > 0 && (
          <form action={probeerOpnieuw}>
            <input type="hidden" name="id" value={id} />
            <button className={knopRand}>Mislukte mails opnieuw proberen ({t.mislukt})</button>
          </form>
        )}
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Kliks per link</h2>
        {links.length === 0 ? (
          <p className={`text-sm ${zacht}`}>Er is nog niet op links geklikt.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {links.map((l) => (
              <li key={l.url} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 break-all text-sm text-accent hover:underline">
                  {l.url}
                </a>
                <span className={`shrink-0 text-sm ${zacht}`}>
                  <strong className="text-foreground">{l.uniek}</strong> {l.uniek === 1 ? "persoon" : "personen"} · {l.totaal}{" "}
                  {l.totaal === 1 ? "klik" : "kliks"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={kaart}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Ontvangers</h2>
          <a href={`${pad}/csv`} className={knopKlein} download>
            Exporteren (CSV)
          </a>
        </div>
        <form action={pad} method="get" className="flex flex-col gap-2 sm:flex-row">
          {filter !== "alle" && <input type="hidden" name="filter" value={filter} />}
          <label htmlFor="q" className="sr-only">
            Zoek op e-mailadres
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Zoek op e-mailadres" className={invoerKlasse} />
          <button className={`${knopRand} shrink-0`}>Zoeken</button>
        </form>
        <nav aria-label="Filter" className="flex flex-wrap gap-1.5">
          {(Object.keys(ONTVANGER_FILTERS) as OntvangerFilter[]).map((f) => (
            <Link
              key={f}
              href={link({ filter: f === "alle" ? undefined : f, pagina: undefined })}
              aria-current={f === filter ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-sm ${
                f === filter ? "border-accent bg-accent-zacht font-medium text-accent" : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
              }`}
            >
              {ONTVANGER_FILTERS[f]}
            </Link>
          ))}
        </nav>
        <p className={`text-xs ${zacht}`}>{(count ?? 0).toLocaleString("nl-NL")} gevonden</p>

        {ontvangers.length > 0 && (
          <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {ontvangers.map((o) => (
              <li key={o.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="flex min-w-0 flex-col">
                  <span className="break-all text-sm">{o.email}</span>
                  {o.fout && <span className="break-words text-xs text-red-700 dark:text-red-300">{o.fout}</span>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-black/5 px-2 py-0.5 dark:bg-white/10">
                    {VERZEND_STATUS_LABEL[o.status] ?? o.status}
                    {o.verzonden_op && ` · ${toonDatumTijd(o.verzonden_op)}`}
                  </span>
                  {o.geopend_op && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
                      Geopend{o.aantal_geopend > 1 ? ` ${o.aantal_geopend}×` : ""}
                    </span>
                  )}
                  {o.geklikt_op && (
                    <span className="rounded-full bg-accent-zacht px-2 py-0.5 text-accent">
                      Geklikt{o.aantal_kliks > 1 ? ` ${o.aantal_kliks}×` : ""}
                    </span>
                  )}
                  {o.afgemeld_op && <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950/50 dark:text-red-200">Afgemeld</span>}
                  {o.gebounced_op && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-900 dark:bg-red-950/50 dark:text-red-200">Onbestelbaar</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        {paginas > 1 && (
          <nav aria-label="Pagina's" className="flex flex-wrap items-center justify-between gap-2 text-sm">
            {pagina > 1 ? (
              <Link href={link({ pagina: String(pagina - 1) })} className={knopKlein}>
                ← Vorige
              </Link>
            ) : (
              <span />
            )}
            <span className={zacht}>
              Pagina {pagina} van {paginas}
            </span>
            {pagina < paginas ? (
              <Link href={link({ pagina: String(pagina + 1) })} className={knopKlein}>
                Volgende →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </section>
    </main>
  );
}
