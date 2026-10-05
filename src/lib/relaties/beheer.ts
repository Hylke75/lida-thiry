import "server-only";
import { adminClient } from "../supabase/admin";
import { alles } from "../supabase/alles";
import { likeLetterlijk } from "../nieuwsbrief/contactregels";
import { normaliseerTag } from "../nieuwsbrief/doelgroep";
import { verwijderContacten } from "../nieuwsbrief/beheer";
import { BETAALDE_STATUSSEN } from "@/app/admin/status";
import { RELATIE_VELDEN, type Relatie } from "./regels";
import { tagsInGebruik, type Koppelingen } from "./zoeken";
import { planImport, type BestaandVoorImport, type ImportPlan, type RelatieImportRij } from "./csv";
import type { SamenvoegPlan } from "./dubbel";
import type { TijdlijnAntwoord, TijdlijnBericht, TijdlijnBestelling, TijdlijnNieuwsbrief, TijdlijnVerzending } from "./tijdlijn";

// Beheer van het adresboek bovenop de kern (regels.ts, koppel.ts): lijsten,
// koppelingen, bulkacties, import, samenvoegen en AVG.

/** Het hele adresboek. Klein genoeg om in het geheugen te filteren en te sorteren. */
export async function alleRelaties(): Promise<Relatie[]> {
  return alles<Relatie>((van, tot) => adminClient().from("relaties").select(RELATIE_VELDEN).order("id").range(van, tot));
}

/** Alle tags in het adresboek, alfabetisch (voor suggesties). */
export async function alleRelatieTags(): Promise<string[]> {
  const rijen = await alles<{ tags: string[] }>((van, tot) =>
    adminClient().from("relaties").select("tags").neq("tags", "{}").order("id").range(van, tot),
  );
  return tagsInGebruik(rijen);
}

export async function relatieOpId(id: string): Promise<Relatie | null> {
  const { data, error } = await adminClient().from("relaties").select(RELATIE_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Relatie | null) ?? null;
}

/** Een andere relatie met dit e-mailadres (voor de controle op uniek), of null. */
export async function relatieMetEmail(email: string, behalveId?: string): Promise<Relatie | null> {
  let q = adminClient().from("relaties").select(RELATIE_VELDEN).eq("email", email.toLowerCase());
  if (behalveId) q = q.neq("id", behalveId);
  const { data } = await q.maybeSingle();
  return (data as Relatie | null) ?? null;
}

/** Wie klant is, op de nieuwsbrief staat of een bericht stuurde. */
export async function haalKoppelingen(): Promise<Koppelingen> {
  const supabase = adminClient();
  const [orders, contacten, berichten] = await Promise.all([
    alles<{ email: string }>((van, tot) =>
      supabase.from("orders").select("email").in("status", BETAALDE_STATUSSEN).order("id").range(van, tot),
    ),
    alles<{ email: string }>((van, tot) =>
      supabase.from("nb_contacten").select("email").eq("status", "aangemeld").order("id").range(van, tot),
    ),
    alles<{ email: string; relatie_id: string | null }>((van, tot) =>
      supabase.from("contact_berichten").select("email, relatie_id").neq("status", "spam").order("id").range(van, tot),
    ),
  ]);
  return {
    klant: new Set(orders.map((o) => o.email.trim().toLowerCase())),
    nieuwsbrief: new Set(contacten.map((c) => c.email.toLowerCase())),
    berichtEmails: new Set(berichten.map((b) => b.email.toLowerCase())),
    berichtRelaties: new Set(berichten.map((b) => b.relatie_id).filter((id): id is string => Boolean(id))),
  };
}

/** Voegt een tag toe aan of haalt hem weg bij de gegeven relaties. Geeft het aantal gewijzigde terug. */
export async function wijzigTagRelaties(ids: string[], tag: string, actie: "toevoegen" | "verwijderen"): Promise<number> {
  const t = normaliseerTag(tag);
  if (!t || !ids.length) return 0;
  const supabase = adminClient();
  const { data, error } = await supabase.from("relaties").select("id, tags").in("id", ids);
  if (error) throw new Error(error.message);
  let n = 0;
  for (const r of (data ?? []) as { id: string; tags: string[] }[]) {
    const heeft = r.tags.includes(t);
    if (actie === "toevoegen" ? heeft : !heeft) continue;
    const tags = actie === "toevoegen" ? [...r.tags, t] : r.tags.filter((x) => x !== t);
    const { error: fout } = await supabase.from("relaties").update({ tags }).eq("id", r.id);
    if (fout) throw new Error(fout.message);
    n++;
  }
  return n;
}

/**
 * Verwijdert relaties uit het adresboek. Bestellingen, nieuwsbriefcontacten en
 * berichten blijven bestaan (berichten verliezen alleen de koppeling).
 */
export async function verwijderRelaties(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const { data, error } = await adminClient().from("relaties").delete().in("id", ids).select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

// Tijdlijn ---------------------------------------------------------------------------

export interface RelatieGeschiedenis {
  bestellingen: TijdlijnBestelling[];
  nieuwsbrief: TijdlijnNieuwsbrief | null;
  verzendingen: TijdlijnVerzending[];
  berichten: TijdlijnBericht[];
  antwoorden: TijdlijnAntwoord[];
}

/** Alles wat aan deze relatie gekoppeld is: via het e-mailadres en (berichten) via de relatie-id. */
export async function geschiedenis(r: Pick<Relatie, "id" | "email">): Promise<RelatieGeschiedenis> {
  const supabase = adminClient();
  const email = r.email;
  const [orders, contact, berichtenOpId, berichtenOpEmail] = await Promise.all([
    email
      ? supabase
          .from("orders")
          .select("id, status, bedrag_cent, valuta, toegekend_type, aangemaakt_op, betaald_op, afgerond_op")
          .ilike("email", likeLetterlijk(email))
          .order("aangemaakt_op", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [] }),
    email
      ? supabase.from("nb_contacten").select("id, status, aangemaakt_op, bevestigd_op, afgemeld_op").eq("email", email).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("contact_berichten").select("id, onderwerp, status, aangemaakt_op").eq("relatie_id", r.id).limit(200),
    email
      ? supabase.from("contact_berichten").select("id, onderwerp, status, aangemaakt_op").eq("email", email).limit(200)
      : Promise.resolve({ data: [] }),
  ]);

  const berichten = new Map<string, TijdlijnBericht>();
  for (const b of [...(berichtenOpId.data ?? []), ...(berichtenOpEmail.data ?? [])] as TijdlijnBericht[]) berichten.set(b.id, b);
  const nieuwsbrief = (contact.data as TijdlijnNieuwsbrief | null) ?? null;

  const [verzendingen, antwoorden] = await Promise.all([
    nieuwsbrief
      ? supabase
          .from("nb_verzendingen")
          .select("id, status, verzonden_op, aangemaakt_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, campagne:nb_campagnes(id, naam)")
          .eq("contact_id", nieuwsbrief.id)
          .order("aangemaakt_op", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [] }),
    berichten.size
      ? supabase.from("contact_antwoorden").select("id, bericht_id, verzonden_op").in("bericht_id", [...berichten.keys()])
      : Promise.resolve({ data: [] }),
  ]);

  return {
    bestellingen: (orders.data ?? []) as TijdlijnBestelling[],
    nieuwsbrief,
    verzendingen: (verzendingen.data ?? []) as unknown as TijdlijnVerzending[],
    berichten: [...berichten.values()],
    antwoorden: (antwoorden.data ?? []) as TijdlijnAntwoord[],
  };
}

// Import -----------------------------------------------------------------------------

async function bestaandeOpEmail(emails: string[]): Promise<Map<string, BestaandVoorImport>> {
  const supabase = adminClient();
  const uit = new Map<string, BestaandVoorImport>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await supabase.from("relaties").select(RELATIE_VELDEN).in("email", emails.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const r of (data ?? []) as Relatie[]) if (r.email) uit.set(r.email, r);
  }
  return uit;
}

export interface ImportTelling {
  nieuw: number;
  bijgewerkt: number;
  ongewijzigd: number;
}

const telling = (p: ImportPlan): ImportTelling => ({ nieuw: p.nieuw.length, bijgewerkt: p.bijwerken.length, ongewijzigd: p.ongewijzigd });

/** Wat een import zou doen, zonder iets op te slaan. */
export async function voorbeeldImportRelaties(rijen: Pick<RelatieImportRij, "gegevens" | "tags">[], extraTag: string | null): Promise<ImportTelling> {
  const bestaand = await bestaandeOpEmail(rijen.map((r) => r.gegevens.email));
  return telling(planImport(rijen, bestaand, extraTag));
}

/** Voert een import uit: nieuwe relaties aanmaken (bron ‘import’) en bestaande alleen aanvullen. */
export async function importeerRelaties(rijen: Pick<RelatieImportRij, "gegevens" | "tags">[], extraTag: string | null): Promise<ImportTelling> {
  const supabase = adminClient();
  const plan = planImport(rijen, await bestaandeOpEmail(rijen.map((r) => r.gegevens.email)), extraTag);
  let nieuw = 0;
  for (let i = 0; i < plan.nieuw.length; i += 500) {
    const deel = plan.nieuw.slice(i, i + 500).map((n) => ({ ...n.gegevens, tags: n.tags, bron: "import" }));
    // ignoreDuplicates: een adres dat intussen is aangemaakt, blijft ongemoeid.
    const { data, error } = await supabase.from("relaties").upsert(deel, { onConflict: "email", ignoreDuplicates: true }).select("id");
    if (error) throw new Error(error.message);
    nieuw += data?.length ?? 0;
  }
  let bijgewerkt = 0;
  for (const b of plan.bijwerken) {
    const { error } = await supabase.from("relaties").update(b.wijziging).eq("id", b.id);
    if (error) throw new Error(error.message);
    bijgewerkt++;
  }
  return { nieuw, bijgewerkt, ongewijzigd: plan.ongewijzigd };
}

// Samenvoegen ------------------------------------------------------------------------

/**
 * Voert een samenvoegplan uit. Volgorde zo dat er bij een fout niets verloren
 * gaat: eerst alles met een relatie-id (berichten, afspraken) omzetten, dan (zo nodig) het e-mailadres van de
 * verdwijnende relatie vrijmaken, dan de blijvende bijwerken en pas daarna de
 * andere verwijderen.
 */
export async function voerSamenvoegingUit(plan: SamenvoegPlan): Promise<void> {
  const supabase = adminClient();
  const stap = async (p: PromiseLike<{ error: { message: string } | null }>, wat: string) => {
    const { error } = await p;
    if (error) throw new Error(`${wat}: ${error.message}`);
  };
  await stap(
    supabase.from("contact_berichten").update({ relatie_id: plan.blijftId }).eq("relatie_id", plan.wegId),
    "Berichten omzetten",
  );
  await stap(
    supabase.from("afspraken").update({ relatie_id: plan.blijftId }).eq("relatie_id", plan.wegId),
    "Afspraken omzetten",
  );
  if (plan.emailOvernemen) {
    await stap(supabase.from("relaties").update({ email: null }).eq("id", plan.wegId), "E-mailadres vrijmaken");
  }
  await stap(supabase.from("relaties").update(plan.wijziging).eq("id", plan.blijftId), "Relatie bijwerken");
  await stap(supabase.from("relaties").delete().eq("id", plan.wegId), "Dubbele relatie verwijderen");
}

// AVG --------------------------------------------------------------------------------

/** Id's van alle contactberichten van deze relatie: gekoppeld via de relatie-id of via het e-mailadres. */
async function berichtIdsVan(r: Pick<Relatie, "id" | "email">): Promise<string[]> {
  const supabase = adminClient();
  const [opId, opEmail] = await Promise.all([
    supabase.from("contact_berichten").select("id").eq("relatie_id", r.id),
    r.email ? supabase.from("contact_berichten").select("id").eq("email", r.email) : Promise.resolve({ data: [], error: null }),
  ]);
  if (opId.error) throw new Error(opId.error.message);
  if (opEmail.error) throw new Error(opEmail.error.message);
  return [...new Set([...(opId.data ?? []), ...(opEmail.data ?? [])].map((b) => String((b as { id: string }).id)))];
}

const GEHEIME_ORDERVELDEN = ["testtoken", "token_verloopt_op", "mollie_payment_id", "pdf_pad", "factuur_pad"];
const GEHEIME_AFSPRAAKVELDEN = ["token", "mollie_payment_id"];

/** Id's van alle afspraken van deze relatie: gekoppeld via de relatie-id of via het e-mailadres. */
async function afspraakIdsVan(r: Pick<Relatie, "id" | "email">): Promise<string[]> {
  const supabase = adminClient();
  const [opId, opEmail] = await Promise.all([
    supabase.from("afspraken").select("id").eq("relatie_id", r.id),
    r.email ? supabase.from("afspraken").select("id").eq("email", r.email.toLowerCase()) : Promise.resolve({ data: [], error: null }),
  ]);
  if (opId.error) throw new Error(opId.error.message);
  if (opEmail.error) throw new Error(opEmail.error.message);
  return [...new Set([...(opId.data ?? []), ...(opEmail.data ?? [])].map((a) => String((a as { id: string }).id)))];
}

/**
 * Alles wat over deze relatie is opgeslagen (AVG-inzageverzoek): de relatie,
 * bestellingen (zonder interne sleutels en opslagpaden) met testresultaten, het
 * nieuwsbriefcontact met ontvangen mails, contactberichten met antwoorden en
 * afspraken (zonder interne sleutels).
 */
export async function gegevensVanRelatie(id: string): Promise<Record<string, unknown> | null> {
  const supabase = adminClient();
  const { data: relatie } = await supabase.from("relaties").select("*").eq("id", id).maybeSingle();
  if (!relatie) return null;
  const email = (relatie as { email: string | null }).email;

  const { data: orders } = email
    ? await supabase.from("orders").select("*").ilike("email", likeLetterlijk(email)).order("aangemaakt_op")
    : { data: [] };
  const bestellingen = ((orders ?? []) as Record<string, unknown>[]).map((o) =>
    Object.fromEntries(Object.entries(o).filter(([k]) => !GEHEIME_ORDERVELDEN.includes(k))),
  );
  const orderIds = bestellingen.map((o) => String(o.id));
  const { data: testresultaten } = orderIds.length
    ? await supabase.from("testresultaten").select("*").in("order_id", orderIds)
    : { data: [] };

  const { data: contact } = email ? await supabase.from("nb_contacten").select("*").eq("email", email).maybeSingle() : { data: null };
  let nieuwsbrief: Record<string, unknown> | null = null;
  if (contact) {
    const { token: _token, ...zonderToken } = contact as Record<string, unknown>;
    void _token;
    const { data: verzendingen } = await supabase
      .from("nb_verzendingen")
      .select("status, verzonden_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, afgemeld_op, gebounced_op, campagne:nb_campagnes(naam, onderwerp)")
      .eq("contact_id", (contact as { id: string }).id)
      .order("aangemaakt_op");
    nieuwsbrief = { contact: zonderToken, ontvangen_mails: verzendingen ?? [] };
  }

  const berichtIds = await berichtIdsVan({ id, email });
  const { data: berichten } = berichtIds.length
    ? await supabase.from("contact_berichten").select("*").in("id", berichtIds).order("aangemaakt_op")
    : { data: [] };
  const { data: antwoorden } = berichtIds.length
    ? await supabase.from("contact_antwoorden").select("bericht_id, tekst, verzonden_op").in("bericht_id", berichtIds).order("verzonden_op")
    : { data: [] };

  const afspraakIds = await afspraakIdsVan({ id, email });
  const { data: afsprakenRuw } = afspraakIds.length
    ? await supabase.from("afspraken").select("*, soort:afspraak_soorten(naam)").in("id", afspraakIds).order("start_op")
    : { data: [] };
  const afspraken = ((afsprakenRuw ?? []) as Record<string, unknown>[]).map((a) =>
    Object.fromEntries(Object.entries(a).filter(([k]) => !GEHEIME_AFSPRAAKVELDEN.includes(k))),
  );

  return {
    toelichting:
      "Overzicht van alle gegevens die Lida Thiry Imago & Kledingadvies over deze persoon heeft opgeslagen (adresboek, bestellingen, nieuwsbrief, contactberichten en afspraken).",
    gemaakt_op: new Date().toISOString(),
    adresboek: relatie,
    bestellingen,
    testresultaten: testresultaten ?? [],
    nieuwsbrief,
    contactberichten: berichten ?? [],
    antwoorden_op_berichten: antwoorden ?? [],
    afspraken,
  };
}

export interface VergeetResultaat {
  nieuwsbrief: number;
  berichten: number;
  /** Afspraken waarvan naam, e-mail, telefoon en opmerkingen zijn gewist. */
  afspraken: number;
}

/** Wat er van een afspraak overblijft na vergeten: tijden, status en betaalde bedragen blijven. */
const GEANONIMISEERDE_AFSPRAAK = {
  relatie_id: null,
  naam: "Verwijderd",
  email: "verwijderd@verwijderd.invalid",
  telefoon: null,
  opmerking: null,
  notitie: "",
} as const;

/**
 * Recht op vergetelheid: verwijdert de relatie en desgewenst het
 * nieuwsbriefcontact en de contactberichten, en wist de persoonsgegevens in
 * afspraken (naam, e-mail, telefoon, opmerkingen; datum, status en betaalde
 * bedragen blijven voor de boekhouding). Bestellingen blijven bestaan vanwege de
 * wettelijke (fiscale) bewaarplicht.
 */
export async function vergeetRelatie(r: Pick<Relatie, "id" | "email">, opties: { nieuwsbrief: boolean; berichten: boolean }): Promise<VergeetResultaat> {
  const supabase = adminClient();
  const uit: VergeetResultaat = { nieuwsbrief: 0, berichten: 0, afspraken: 0 };
  const afspraakIds = await afspraakIdsVan(r);
  if (afspraakIds.length) {
    const { data, error } = await supabase.from("afspraken").update(GEANONIMISEERDE_AFSPRAAK).in("id", afspraakIds).select("id");
    if (error) throw new Error(`Afspraken anonimiseren: ${error.message}`);
    uit.afspraken = data?.length ?? 0;
  }
  if (opties.berichten) {
    const ids = await berichtIdsVan(r);
    if (ids.length) {
      const { data, error } = await supabase.from("contact_berichten").delete().in("id", ids).select("id");
      if (error) throw new Error(`Berichten verwijderen: ${error.message}`);
      uit.berichten = data?.length ?? 0;
    }
  }
  if (opties.nieuwsbrief && r.email) {
    const { data } = await supabase.from("nb_contacten").select("id").eq("email", r.email);
    uit.nieuwsbrief = await verwijderContacten((data ?? []).map((c) => String(c.id)));
  }
  const { error } = await supabase.from("relaties").delete().eq("id", r.id);
  if (error) throw new Error(`Relatie verwijderen: ${error.message}`);
  return uit;
}
