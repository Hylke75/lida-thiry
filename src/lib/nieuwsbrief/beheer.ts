import "server-only";
import { adminClient } from "../supabase/admin";
import { alles } from "../supabase/alles";
import { CONTACT_VELDEN, meldAan, type Contact } from "./contacten";
import { STATUSSEN, normaliseerTag, type ContactStatus } from "./doelgroep";
import { likeLetterlijk, type ContactFilter } from "./contactregels";
import { veiligeZoekterm } from "../zoeken/regels";
import type { ImportRij } from "./csv";

// Contactbeheer bovenop de kern (contacten.ts): opzoeken via de persoonlijke link,
// opnieuw aanmelden, lijsten met filters, bulkacties, import en AVG-export.

/** Contact bij een persoonlijke link (token), of null. */
export async function contactViaToken(token: string): Promise<Contact | null> {
  const { data } = await adminClient().from("nb_contacten").select(CONTACT_VELDEN).eq("token", token).maybeSingle();
  return (data as Contact | null) ?? null;
}

/**
 * Meldt iemand die zich via de afmeldpagina had afgemeld weer aan, met een nieuwe
 * toestemmingstekst. Alleen vanuit status 'afgemeld' (niet bij een klacht of een
 * onbestelbaar adres). De persoonlijke link bewijst dat het om de eigen mailbox gaat.
 */
export async function meldOpnieuwAanViaToken(token: string, toestemmingTekst: string): Promise<Contact | null> {
  const nu = new Date().toISOString();
  const { data } = await adminClient()
    .from("nb_contacten")
    .update({ status: "aangemeld", toestemming_op: nu, toestemming_tekst: toestemmingTekst, bevestigd_op: nu, afgemeld_op: null })
    .eq("token", token)
    .eq("status", "afgemeld")
    .select(CONTACT_VELDEN)
    .maybeSingle();
  return (data as Contact | null) ?? null;
}

/**
 * Aanmelding via het vinkje bij een betaalde bestelling (enkele opt-in: de klant
 * heeft het vinkje zelf aangezet). Gooit nooit: de betaling mag hier niet op stuklopen.
 */
export async function meldAanNaBestelling(opts: { email: string; naam: string | null; toestemmingTekst: string }): Promise<void> {
  try {
    await meldAan({
      email: opts.email,
      naam: opts.naam,
      bron: "bestelling",
      dubbeleOptIn: false,
      toestemmingTekst: opts.toestemmingTekst,
    });
  } catch (e) {
    console.error("Nieuwsbriefaanmelding na bestelling mislukt", e);
  }
}

/** Query op nb_contacten met de filters van de contactenlijst, nieuwste eerst. */
export function contactenQuery(f: ContactFilter, opties: { tellen?: boolean } = {}) {
  let q = adminClient()
    .from("nb_contacten")
    .select(CONTACT_VELDEN, opties.tellen ? { count: "exact" } : undefined)
    .order("aangemaakt_op", { ascending: false })
    .order("id");
  const zoek = f.q ? veiligeZoekterm(f.q) : "";
  if (zoek) q = q.or(`email.ilike.*${zoek}*,naam.ilike.*${zoek}*`);
  if (f.status) q = q.eq("status", f.status);
  if (f.bron) q = q.eq("bron", f.bron);
  if (f.formulier) q = q.eq("formulier_id", f.formulier);
  if (f.tag) q = q.contains("tags", [f.tag]);
  return q;
}

/** Alle contacten binnen een filter (voor de export). */
export async function alleContacten(f: ContactFilter): Promise<Contact[]> {
  return alles<Contact>((van, tot) => contactenQuery(f).range(van, tot));
}

/** Aantal contacten per status. */
export async function tellingPerStatus(): Promise<Record<ContactStatus, number>> {
  const supabase = adminClient();
  const tellingen = await Promise.all(
    STATUSSEN.map(async (s) => {
      const { count } = await supabase.from("nb_contacten").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(tellingen) as Record<ContactStatus, number>;
}

/** Alle tags die in gebruik zijn, alfabetisch. */
export async function alleTags(): Promise<string[]> {
  const rijen = await alles<{ tags: string[] }>((van, tot) =>
    adminClient().from("nb_contacten").select("tags").neq("tags", "{}").order("id").range(van, tot),
  );
  return [...new Set(rijen.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "nl"));
}

/** Voegt een tag toe aan of haalt hem weg bij de gegeven contacten. Geeft het aantal gewijzigde terug. */
export async function wijzigTag(ids: string[], tag: string, actie: "toevoegen" | "verwijderen"): Promise<number> {
  const t = normaliseerTag(tag);
  if (!t || !ids.length) return 0;
  const supabase = adminClient();
  const { data, error } = await supabase.from("nb_contacten").select("id, tags").in("id", ids);
  if (error) throw new Error(error.message);
  let n = 0;
  for (const c of (data ?? []) as { id: string; tags: string[] }[]) {
    const heeft = c.tags.includes(t);
    if (actie === "toevoegen" ? heeft : !heeft) continue;
    const tags = actie === "toevoegen" ? [...c.tags, t] : c.tags.filter((x) => x !== t);
    const { error: fout } = await supabase.from("nb_contacten").update({ tags }).eq("id", c.id);
    if (fout) throw new Error(fout.message);
    n++;
  }
  return n;
}

/** Meldt contacten af (door de beheerder). Geeft het aantal gewijzigde terug. */
export async function meldContactenAf(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const { data, error } = await adminClient()
    .from("nb_contacten")
    .update({ status: "afgemeld", afgemeld_op: new Date().toISOString() })
    .in("id", ids)
    .in("status", ["aangemeld", "onbevestigd"])
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

/**
 * Verwijdert contacten volledig (recht op vergetelheid). Een trigger haalt het
 * e-mailadres ook uit de verzendgeschiedenis; de anonieme cijfers blijven.
 */
export async function verwijderContacten(ids: string[]): Promise<number> {
  if (!ids.length) return 0;
  const { data, error } = await adminClient().from("nb_contacten").delete().in("id", ids).select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export interface ImportVoorbeeld {
  nieuw: number;
  bestaand: number;
  /** Adressen die we niet aanmelden: afgemeld, onbestelbaar of als spam gemeld. */
  geblokkeerd: { email: string; status: ContactStatus }[];
}

const GEBLOKKEERD: readonly ContactStatus[] = ["afgemeld", "gebounced", "klacht"];

async function bestaandeStatussen(emails: string[]): Promise<Map<string, { id: string; status: ContactStatus; naam: string | null; tags: string[] }>> {
  const supabase = adminClient();
  const uit = new Map<string, { id: string; status: ContactStatus; naam: string | null; tags: string[] }>();
  for (let i = 0; i < emails.length; i += 200) {
    const { data, error } = await supabase
      .from("nb_contacten")
      .select("id, email, status, naam, tags")
      .in("email", emails.slice(i, i + 200));
    if (error) throw new Error(error.message);
    for (const c of data ?? []) uit.set(c.email, c);
  }
  return uit;
}

/** Hoeveel adressen uit een import nieuw zijn, al bestaan of worden overgeslagen. */
export async function voorbeeldImport(emails: string[]): Promise<ImportVoorbeeld> {
  const bestaand = await bestaandeStatussen(emails);
  const uit: ImportVoorbeeld = { nieuw: 0, bestaand: 0, geblokkeerd: [] };
  for (const e of emails) {
    const c = bestaand.get(e);
    if (!c) uit.nieuw++;
    else if (GEBLOKKEERD.includes(c.status)) uit.geblokkeerd.push({ email: e, status: c.status });
    else uit.bestaand++;
  }
  return uit;
}

export interface ImportResultaat {
  toegevoegd: number;
  bijgewerkt: number;
  overgeslagen: { email: string; status: ContactStatus }[];
}

/**
 * Importeert gecontroleerde rijen: nieuwe adressen worden aangemeld (bron
 * 'import'), bestaande krijgen de nieuwe tags (en een naam als die ontbrak); een
 * onbevestigd adres wordt aangemeld. Afgemelde, onbestelbare en als spam gemelde
 * adressen worden overgeslagen.
 */
export async function importeer(rijen: ImportRij[], extraTag: string | null, toestemmingTekst: string): Promise<ImportResultaat> {
  const supabase = adminClient();
  const extra = extraTag ? normaliseerTag(extraTag) : "";
  const bestaand = await bestaandeStatussen(rijen.map((r) => r.email));
  const uit: ImportResultaat = { toegevoegd: 0, bijgewerkt: 0, overgeslagen: [] };
  const nu = new Date().toISOString();
  const nieuw: Record<string, unknown>[] = [];

  for (const r of rijen) {
    const tags = [...new Set([...r.tags, ...(extra ? [extra] : [])])];
    const c = bestaand.get(r.email);
    if (!c) {
      nieuw.push({
        email: r.email,
        naam: r.naam,
        tags,
        bron: "import",
        status: "aangemeld",
        toestemming_op: nu,
        toestemming_tekst: toestemmingTekst,
        bevestigd_op: nu,
      });
      continue;
    }
    if (GEBLOKKEERD.includes(c.status)) {
      uit.overgeslagen.push({ email: r.email, status: c.status });
      continue;
    }
    const nieuweTags = [...new Set([...c.tags, ...tags])];
    const wijziging: Record<string, unknown> = {};
    if (nieuweTags.length !== c.tags.length) wijziging.tags = nieuweTags;
    if (!c.naam && r.naam) wijziging.naam = r.naam;
    if (c.status === "onbevestigd") {
      Object.assign(wijziging, { status: "aangemeld", toestemming_op: nu, toestemming_tekst: toestemmingTekst, bevestigd_op: nu });
    }
    if (Object.keys(wijziging).length) {
      const { error } = await supabase.from("nb_contacten").update(wijziging).eq("id", c.id);
      if (error) throw new Error(error.message);
      uit.bijgewerkt++;
    }
  }

  for (let i = 0; i < nieuw.length; i += 500) {
    const deel = nieuw.slice(i, i + 500);
    // ignoreDuplicates: een adres dat intussen (bijv. via het formulier) is aangemaakt, blijft ongemoeid.
    const { data, error } = await supabase
      .from("nb_contacten")
      .upsert(deel, { onConflict: "email", ignoreDuplicates: true })
      .select("id");
    if (error) throw new Error(error.message);
    uit.toegevoegd += data?.length ?? 0;
  }
  return uit;
}

/**
 * Alles wat over één persoon is opgeslagen (AVG-inzageverzoek): het contact, de
 * ontvangen mails met opens en kliks, en de bestellingen met testresultaten op
 * hetzelfde e-mailadres. Geheime sleutels (links) laten we weg.
 */
export async function gegevensVanContact(id: string): Promise<Record<string, unknown> | null> {
  const supabase = adminClient();
  const { data: contact } = await supabase.from("nb_contacten").select("*").eq("id", id).maybeSingle();
  if (!contact) return null;
  const { token: _token, ...contactZonderToken } = contact as Record<string, unknown>;
  void _token;

  const { data: verzendingen } = await supabase
    .from("nb_verzendingen")
    .select(
      "id, email, status, verzonden_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, afgemeld_op, gebounced_op, aangemaakt_op, campagne:nb_campagnes(naam, onderwerp, soort)",
    )
    .eq("contact_id", id)
    .order("aangemaakt_op");
  const verzendIds = (verzendingen ?? []).map((v) => v.id as string);
  const kliks: Record<string, unknown>[] = [];
  for (let i = 0; i < verzendIds.length; i += 200) {
    const { data } = await supabase
      .from("nb_klikken")
      .select("verzending_id, url, op")
      .in("verzending_id", verzendIds.slice(i, i + 200))
      .order("op");
    kliks.push(...(data ?? []));
  }

  const email = String((contact as { email: string }).email);
  const { data: orders } = await supabase.from("orders").select("*").ilike("email", likeLetterlijk(email));
  const bestellingen = ((orders ?? []) as Record<string, unknown>[]).map((o) => {
    const { testtoken: _t, mollie_payment_id: _m, ...rest } = o;
    void _t;
    void _m;
    return rest;
  });
  const orderIds = bestellingen.map((o) => String(o.id));
  const { data: testresultaten } = orderIds.length
    ? await supabase.from("testresultaten").select("*").in("order_id", orderIds)
    : { data: [] };

  return {
    toelichting:
      "Overzicht van alle gegevens die Lida Thiry Imago & Kledingadvies over dit e-mailadres heeft opgeslagen (nieuwsbrief en bestellingen).",
    gemaakt_op: new Date().toISOString(),
    nieuwsbrief: {
      contact: contactZonderToken,
      ontvangen_mails: verzendingen ?? [],
      kliks,
    },
    bestellingen,
    testresultaten: testresultaten ?? [],
  };
}
