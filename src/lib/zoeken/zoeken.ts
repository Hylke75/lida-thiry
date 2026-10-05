import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { formatteerBedrag } from "@/lib/prijs";
import { STATUS_LABEL as ORDER_STATUS } from "@/lib/admin/status";
import { BERICHT_STATUS_LABEL, type BerichtStatus } from "@/lib/contact/regels";
import { STATUS_LABEL as NB_STATUS, type ContactStatus } from "@/lib/nieuwsbrief/doelgroep";
import { fragment, metZoekterm, orGroepen, zoekWoorden } from "./regels";
import { datumTijd } from "@/lib/datum";

/** Hoeveel treffers per soort we tonen; de rest via "meer". */
const PER_GROEP = 8;

interface ZoekTreffer {
  id: string;
  href: string;
  titel: string;
  /** Tweede regel (e-mail, slug, ...). */
  sub?: string;
  /** Stukje tekst rond de treffer (bijv. uit een bericht). */
  tekst?: string;
  /** Klein label rechts (status). */
  label?: string;
}

export interface ZoekGroep {
  soort: string;
  label: string;
  totaal: number;
  treffers: ZoekTreffer[];
  /** Link naar de lijst van de module (met de zoekterm als die daar werkt). */
  meer: string;
  /** Of de lijst de zoekterm overneemt. */
  meerGefilterd: boolean;
  fout?: boolean;
}

type Rij = Record<string, unknown>;

interface Definitie {
  soort: string;
  label: string;
  tabel: string;
  kolommen: readonly string[];
  select: string;
  volgorde: string;
  /** Ook zoeken op het begin van het id (bestelnummer). */
  idBereik?: boolean;
  /** Lijstpagina en de naam van de zoekparameter daar (null = lijst zoekt niet). */
  lijst: { pad: string; param: string | null };
  treffer: (r: Rij, woorden: readonly string[]) => ZoekTreffer;
}

const s = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
const samen = (...delen: unknown[]): string => delen.map(s).filter(Boolean).join(" · ");

function datum(v: unknown): string {
  const d = new Date(s(v));
  return Number.isNaN(d.getTime()) ? "" : datumTijd(d);
}

const DEFINITIES: readonly Definitie[] = [
  {
    soort: "bestellingen",
    label: "Bestellingen",
    tabel: "orders",
    kolommen: ["klantnaam", "email", "kortingscode"],
    select: "id, klantnaam, email, status, bedrag_cent, valuta, kortingscode, aangemaakt_op",
    volgorde: "aangemaakt_op",
    idBereik: true,
    lijst: { pad: "/admin/bestellingen", param: "q" },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/order/${s(r.id)}`,
      titel: s(r.klantnaam) || s(r.email),
      sub: samen(
        r.email,
        `#${s(r.id).slice(0, 8)}`,
        r.bedrag_cent != null ? formatteerBedrag(Number(r.bedrag_cent), s(r.valuta) || "EUR") : "",
        r.kortingscode ? `code ${s(r.kortingscode)}` : "",
        datum(r.aangemaakt_op),
      ),
      label: ORDER_STATUS[s(r.status)] ?? s(r.status),
    }),
  },
  {
    soort: "relaties",
    label: "Adresboek",
    tabel: "relaties",
    kolommen: ["voornaam", "achternaam", "email", "telefoon", "plaats", "bedrijf"],
    select: "id, voornaam, achternaam, email, telefoon, plaats, bedrijf, bijgewerkt_op",
    volgorde: "bijgewerkt_op",
    lijst: { pad: "/admin/adresboek", param: "q" },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/adresboek/${s(r.id)}`,
      titel: [s(r.voornaam), s(r.achternaam)].filter(Boolean).join(" ") || s(r.email) || "(zonder naam)",
      sub: samen(r.email, r.telefoon, r.bedrijf, r.plaats),
    }),
  },
  {
    soort: "berichten",
    label: "Berichten",
    tabel: "contact_berichten",
    kolommen: ["naam", "email", "onderwerp", "bericht"],
    select: "id, naam, email, onderwerp, bericht, status, aangemaakt_op",
    volgorde: "aangemaakt_op",
    lijst: { pad: "/admin/berichten", param: "q" },
    treffer: (r, woorden) => ({
      id: s(r.id),
      href: `/admin/berichten/${s(r.id)}`,
      titel: samen(r.naam, r.onderwerp),
      sub: samen(r.email, datum(r.aangemaakt_op)),
      tekst: fragment(s(r.bericht), woorden),
      label: BERICHT_STATUS_LABEL[s(r.status) as BerichtStatus] ?? s(r.status),
    }),
  },
  {
    soort: "afspraken",
    label: "Afspraken",
    tabel: "afspraken",
    kolommen: ["naam", "email"],
    select: "id, naam, email, start_op, status",
    volgorde: "start_op",
    lijst: { pad: "/admin/afspraken", param: "q" },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/afspraken/${s(r.id)}`,
      titel: s(r.naam),
      sub: samen(r.email, datum(r.start_op)),
      label: s(r.status).replace(/_/g, " "),
    }),
  },
  {
    soort: "nieuwsbrief-contacten",
    label: "Nieuwsbriefcontacten",
    tabel: "nb_contacten",
    kolommen: ["email", "naam"],
    select: "id, email, naam, status, aangemaakt_op",
    volgorde: "aangemaakt_op",
    lijst: { pad: "/admin/nieuwsbrief/contacten", param: "q" },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/nieuwsbrief/contacten/${s(r.id)}`,
      titel: s(r.naam) || s(r.email),
      sub: s(r.naam) ? s(r.email) : undefined,
      label: NB_STATUS[s(r.status) as ContactStatus] ?? s(r.status),
    }),
  },
  {
    soort: "campagnes",
    label: "Nieuwsbrieven",
    tabel: "nb_campagnes",
    kolommen: ["naam", "onderwerp"],
    select: "id, soort, naam, onderwerp, status, bijgewerkt_op",
    volgorde: "bijgewerkt_op",
    lijst: { pad: "/admin/nieuwsbrief/campagnes", param: null },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/nieuwsbrief/${s(r.soort) === "automatisch" ? "automatisch" : "campagnes"}/${s(r.id)}`,
      titel: s(r.naam),
      sub: samen(r.onderwerp, s(r.soort) === "automatisch" ? "automatisch" : ""),
      label: s(r.status),
    }),
  },
  {
    soort: "paginas",
    label: "Pagina's",
    tabel: "paginas",
    kolommen: ["titel", "slug"],
    select: "id, titel, slug, status, bijgewerkt_op",
    volgorde: "bijgewerkt_op",
    lijst: { pad: "/admin/paginas", param: null },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/paginas/${s(r.id)}`,
      titel: s(r.titel),
      sub: `/${s(r.slug)}`,
      label: s(r.status),
    }),
  },
  {
    soort: "blog",
    label: "Blog",
    tabel: "blog_berichten",
    kolommen: ["titel", "slug", "samenvatting"],
    select: "id, titel, slug, samenvatting, status, bijgewerkt_op",
    volgorde: "bijgewerkt_op",
    lijst: { pad: "/admin/blog", param: "zoek" },
    treffer: (r, woorden) => ({
      id: s(r.id),
      href: `/admin/blog/${s(r.id)}`,
      titel: s(r.titel),
      sub: `/blog/${s(r.slug)}`,
      tekst: s(r.samenvatting) ? fragment(s(r.samenvatting), woorden) : undefined,
      label: s(r.status),
    }),
  },
  {
    soort: "kortingscodes",
    label: "Kortingscodes",
    tabel: "kortingscodes",
    kolommen: ["code", "omschrijving"],
    select: "id, code, omschrijving, actief, aantal_gebruikt, aangemaakt_op",
    volgorde: "aangemaakt_op",
    lijst: { pad: "/admin/kortingscodes", param: null },
    treffer: (r) => ({
      id: s(r.id),
      href: "/admin/kortingscodes",
      titel: s(r.code),
      sub: samen(r.omschrijving, `${Number(r.aantal_gebruikt ?? 0)}× gebruikt`),
      label: r.actief ? "actief" : "uit",
    }),
  },
  {
    soort: "media",
    label: "Media",
    tabel: "media",
    kolommen: ["naam", "alt"],
    select: "id, naam, alt, map, aangemaakt_op",
    volgorde: "aangemaakt_op",
    lijst: { pad: "/admin/media", param: "q" },
    treffer: (r) => ({
      id: s(r.id),
      href: `/admin/media/${s(r.id)}`,
      titel: s(r.naam),
      sub: samen(r.alt, r.map),
    }),
  },
];

async function zoekIn(d: Definitie, q: string, woorden: readonly string[]): Promise<ZoekGroep> {
  const meer = metZoekterm(d.lijst.pad, d.lijst.param, q);
  const basis = { soort: d.soort, label: d.label, meer, meerGefilterd: Boolean(d.lijst.param) };
  try {
    let query = adminClient()
      .from(d.tabel)
      .select(d.select, { count: "exact" })
      .order(d.volgorde, { ascending: false })
      .limit(PER_GROEP);
    for (const groep of orGroepen(d.kolommen, woorden, { idBereik: d.idBereik })) query = query.or(groep);
    const { data, count, error } = await query;
    if (error) throw new Error(error.message);
    const rijen = (data ?? []) as unknown as Rij[];
    return { ...basis, totaal: count ?? rijen.length, treffers: rijen.map((r) => d.treffer(r, woorden)) };
  } catch (e) {
    console.error(`Zoeken in ${d.tabel} mislukt`, e);
    return { ...basis, totaal: 0, treffers: [], fout: true };
  }
}

/**
 * Zoekt in alle modules tegelijk. Elk woord van de zoekterm moet in minstens één
 * van de kolommen voorkomen. Groepen zonder treffers vallen weg (behalve bij een fout).
 */
export async function zoekOveral(q: string): Promise<{ woorden: string[]; groepen: ZoekGroep[] }> {
  const woorden = zoekWoorden(q);
  if (woorden.length === 0) return { woorden, groepen: [] };
  const groepen = await Promise.all(DEFINITIES.map((d) => zoekIn(d, q, woorden)));
  return { woorden, groepen: groepen.filter((g) => g.totaal > 0 || g.fout) };
}
