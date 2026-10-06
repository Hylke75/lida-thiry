import "server-only";
import { adminClient } from "../supabase/admin";
import { aanvulling, RELATIE_VELDEN, schoonGegevens, splitsNaam, type Relatie, type RelatieBron, type RelatieGegevens } from "./regels";

export interface Koppeling extends Partial<Record<keyof RelatieGegevens, string | null>> {
  /** Volledige naam; wordt gesplitst in voor- en achternaam als die ontbreken. */
  naam?: string | null;
  bron: RelatieBron;
  tags?: string[];
}

/**
 * Zoekt de relatie bij dit e-mailadres of maakt hem aan, en vult lege velden aan.
 * Bestaande (handmatig gecorrigeerde) gegevens worden nooit overschreven.
 * Gooit nooit: koppelen mag een bestelling, aanmelding of bericht niet tegenhouden.
 */
export async function koppelRelatie(k: Koppeling): Promise<Relatie | null> {
  try {
    const naam = splitsNaam(k.naam);
    const gegevens = schoonGegevens({
      ...k,
      voornaam: k.voornaam ?? naam.voornaam,
      achternaam: k.achternaam ?? naam.achternaam,
    });
    if (!gegevens.email) return null;
    const supabase = adminClient();
    const { data: bestaand } = await supabase.from("relaties").select(RELATIE_VELDEN).eq("email", gegevens.email).maybeSingle();
    const tags = (k.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean);

    if (bestaand) {
      const r = bestaand as Relatie;
      const wijziging: Record<string, unknown> = aanvulling(r, gegevens);
      const nieuweTags = [...new Set([...r.tags, ...tags])];
      if (nieuweTags.length !== r.tags.length) wijziging.tags = nieuweTags;
      if (!Object.keys(wijziging).length) return r;
      const { data } = await supabase.from("relaties").update(wijziging).eq("id", r.id).select(RELATIE_VELDEN).single();
      return (data as Relatie) ?? r;
    }

    const { data, error } = await supabase
      .from("relaties")
      .insert({ ...gegevens, bron: k.bron, tags })
      .select(RELATIE_VELDEN)
      .single();
    if (error) {
      // Gelijktijdig aangemaakt door een ander verzoek: dan gewoon opnieuw ophalen.
      const { data: opnieuw } = await supabase.from("relaties").select(RELATIE_VELDEN).eq("email", gegevens.email).maybeSingle();
      return (opnieuw as Relatie | null) ?? null;
    }
    return data as Relatie;
  } catch (e) {
    console.error("Relatie koppelen mislukt", e);
    return null;
  }
}
