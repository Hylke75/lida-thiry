import "server-only";
import { adminClient } from "../supabase/admin";
import { ontleedSleutel } from "../adviestypes-beheer";
import {
  normaliseerTag,
  valtBinnen,
  type Bron,
  type ContactStatus,
  type Doelgroep,
  type Klantinfo,
} from "./doelgroep";

export interface Contact {
  id: string;
  email: string;
  naam: string | null;
  status: ContactStatus;
  bron: Bron;
  tags: string[];
  token: string;
  toestemming_op: string | null;
  toestemming_tekst: string | null;
  bevestigd_op: string | null;
  afgemeld_op: string | null;
  aangemaakt_op: string;
}

export const CONTACT_VELDEN =
  "id, email, naam, status, bron, tags, token, toestemming_op, toestemming_tekst, bevestigd_op, afgemeld_op, aangemaakt_op";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseerEmail(email: string): string | null {
  const e = email.trim().toLowerCase();
  return e.length <= 254 && EMAIL.test(e) ? e : null;
}

/** Haalt alle rijen op in pagina's van 1000 (Supabase geeft er standaard maximaal 1000). */
async function alles<T>(
  haal: (van: number, tot: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const uit: T[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await haal(van, van + 999);
    if (error) throw new Error(error.message);
    uit.push(...(data ?? []));
    if (!data || data.length < 1000) return uit;
  }
}

/** Per e-mailadres: heeft betaald besteld en welke figuurtypes (letters) eruit kwamen. */
export async function klantinfoPerEmail(): Promise<Map<string, Klantinfo>> {
  const supabase = adminClient();
  const rijen = await alles<{ email: string; status: string; toegekend_type: string | null }>((van, tot) =>
    supabase
      .from("orders")
      .select("email, status, toegekend_type")
      .in("status", ["betaald", "test_afgerond", "handmatige_beoordeling", "advies_verzonden"])
      .range(van, tot),
  );
  const info = new Map<string, Klantinfo>();
  for (const r of rijen) {
    const email = r.email.trim().toLowerCase();
    const k = info.get(email) ?? { besteld: true, figuurtypes: new Set<string>() };
    const letter = r.toegekend_type ? ontleedSleutel(r.toegekend_type)?.letter : undefined;
    if (letter) k.figuurtypes.add(letter);
    info.set(email, k);
  }
  return info;
}

/** Alle aangemelde contacten die binnen de doelgroep vallen. */
export async function zoekOntvangers(d: Doelgroep): Promise<Contact[]> {
  const supabase = adminClient();
  const contacten = await alles<Contact>((van, tot) =>
    supabase.from("nb_contacten").select(CONTACT_VELDEN).eq("status", "aangemeld").order("aangemaakt_op").range(van, tot),
  );
  const klant = d.besteld || d.figuurtypes?.length ? await klantinfoPerEmail() : undefined;
  return contacten.filter((c) => valtBinnen(c, d, klant?.get(c.email)));
}

export interface Aanmelding {
  email: string;
  naam?: string | null;
  bron: Bron;
  /** De tekst waarmee toestemming is gegeven (bewijs voor de AVG). */
  toestemmingTekst: string;
  tags?: string[];
  /** true = eerst bevestigen via e-mail (dubbele opt-in, voor het websiteformulier). */
  dubbeleOptIn: boolean;
}

export type AanmeldUitkomst =
  | { soort: "ongeldig" }
  | { soort: "al_aangemeld"; contact: Contact }
  | { soort: "bevestigen"; contact: Contact }
  | { soort: "aangemeld"; contact: Contact };

/**
 * Meldt iemand aan of werkt een bestaand contact bij. Afgemelde of onbestelbare
 * adressen worden alleen opnieuw actief via dubbele opt-in of een nieuwe, expliciete
 * toestemming; een klacht (spammelding) blijft altijd staan.
 */
export async function meldAan(a: Aanmelding): Promise<AanmeldUitkomst> {
  const email = normaliseerEmail(a.email);
  if (!email) return { soort: "ongeldig" };
  const supabase = adminClient();
  const { data: bestaand } = await supabase.from("nb_contacten").select(CONTACT_VELDEN).eq("email", email).maybeSingle();
  const nu = new Date().toISOString();
  const tags = (a.tags ?? []).map(normaliseerTag).filter(Boolean);
  const naam = a.naam?.trim().slice(0, 120) || null;

  if (bestaand) {
    const c = bestaand as Contact;
    if (c.status === "aangemeld") {
      const nieuweTags = [...new Set([...c.tags, ...tags])];
      if (nieuweTags.length !== c.tags.length || (!c.naam && naam)) {
        await supabase.from("nb_contacten").update({ tags: nieuweTags, naam: c.naam ?? naam }).eq("id", c.id);
      }
      return { soort: "al_aangemeld", contact: c };
    }
    if (c.status === "klacht") return { soort: "al_aangemeld", contact: c };
    const wijziging = {
      naam: c.naam ?? naam,
      tags: [...new Set([...c.tags, ...tags])],
      toestemming_op: nu,
      toestemming_tekst: a.toestemmingTekst,
      ...(a.dubbeleOptIn
        ? { status: "onbevestigd" as const }
        : { status: "aangemeld" as const, bevestigd_op: nu, afgemeld_op: null }),
    };
    const { data, error } = await supabase.from("nb_contacten").update(wijziging).eq("id", c.id).select(CONTACT_VELDEN).single();
    if (error) throw new Error(`aanmelden: ${error.message}`);
    return { soort: a.dubbeleOptIn ? "bevestigen" : "aangemeld", contact: data as Contact };
  }

  const { data, error } = await supabase
    .from("nb_contacten")
    .insert({
      email,
      naam,
      bron: a.bron,
      tags,
      toestemming_op: nu,
      toestemming_tekst: a.toestemmingTekst,
      status: a.dubbeleOptIn ? "onbevestigd" : "aangemeld",
      bevestigd_op: a.dubbeleOptIn ? null : nu,
    })
    .select(CONTACT_VELDEN)
    .single();
  if (error) throw new Error(`aanmelden: ${error.message}`);
  return { soort: a.dubbeleOptIn ? "bevestigen" : "aangemeld", contact: data as Contact };
}

/** Bevestigt een aanmelding (dubbele opt-in). Geeft het contact terug, of null bij een onbekende link. */
export async function bevestig(token: string): Promise<Contact | null> {
  const supabase = adminClient();
  const { data } = await supabase.from("nb_contacten").select(CONTACT_VELDEN).eq("token", token).maybeSingle();
  const c = data as Contact | null;
  if (!c) return null;
  if (c.status !== "onbevestigd") return c;
  const { data: bij } = await supabase
    .from("nb_contacten")
    .update({ status: "aangemeld", bevestigd_op: new Date().toISOString(), afgemeld_op: null })
    .eq("id", c.id)
    .select(CONTACT_VELDEN)
    .single();
  return (bij as Contact) ?? c;
}

/**
 * Meldt af via de persoonlijke link. Registreert ook bij welke verzending (als
 * bekend) de afmelding hoort, voor de campagnestatistiek.
 */
export async function meldAf(token: string, verzendingId?: string | null): Promise<Contact | null> {
  const supabase = adminClient();
  const { data } = await supabase.from("nb_contacten").select(CONTACT_VELDEN).eq("token", token).maybeSingle();
  const c = data as Contact | null;
  if (!c) return null;
  const nu = new Date().toISOString();
  if (c.status === "aangemeld" || c.status === "onbevestigd") {
    await supabase.from("nb_contacten").update({ status: "afgemeld", afgemeld_op: nu }).eq("id", c.id);
  }
  // Koppel aan de meest recente verzending als er geen specifieke is meegegeven.
  let doel = verzendingId ?? null;
  if (!doel) {
    const { data: laatste } = await supabase
      .from("nb_verzendingen")
      .select("id")
      .eq("contact_id", c.id)
      .eq("status", "verzonden")
      .order("verzonden_op", { ascending: false })
      .limit(1)
      .maybeSingle();
    doel = laatste?.id ?? null;
  }
  if (doel) {
    await supabase.from("nb_verzendingen").update({ afgemeld_op: nu }).eq("id", doel).eq("contact_id", c.id).is("afgemeld_op", null);
  }
  return { ...c, status: "afgemeld", afgemeld_op: nu };
}
