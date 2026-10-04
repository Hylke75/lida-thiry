"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { valideerBlokken, type Blok } from "@/lib/nieuwsbrief/blokken";
import { normaliseerDoelgroep, type Doelgroep } from "@/lib/nieuwsbrief/doelgroep";
import { normaliseerEmail, zoekOntvangers } from "@/lib/nieuwsbrief/contacten";
import { haalCampagne, stuurTestmail, verzendProblemen } from "@/lib/nieuwsbrief/verzenden";
import { normaliseerVertraging, TRIGGERS, type Trigger } from "@/lib/nieuwsbrief/sjablonen";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { doelgroepMetWachttijd, normaliseerAb } from "@/lib/nieuwsbrief/ab-test";
import { AFBEELDING_MAX_BYTES, AFBEELDING_TYPES, BUCKET, LIMIETEN, type MailInhoud } from "./regels";

type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fouten: string[] };

const tekst = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

function leesInhoud(ruw: unknown): { inhoud: MailInhoud; fouten: string[] } {
  const o = ruw && typeof ruw === "object" ? (ruw as Record<string, unknown>) : {};
  const { blokken, fouten } = valideerBlokken(o.blokken);
  const trigger = TRIGGERS.includes(o.trigger as Trigger) ? (o.trigger as Trigger) : null;
  // A/B-test aangezet maar zonder tweede onderwerp: liever een duidelijke fout dan stilletjes uitzetten.
  const abRuw = o.ab && typeof o.ab === "object" ? (o.ab as Record<string, unknown>) : null;
  const ab = normaliseerAb(abRuw, LIMIETEN.onderwerp);
  if (abRuw && !ab) fouten.push("Vul onderwerp B in, of zet de A/B-test uit.");
  return {
    inhoud: {
      naam: tekst(o.naam, LIMIETEN.naam),
      onderwerp: tekst(o.onderwerp, LIMIETEN.onderwerp),
      preheader: tekst(o.preheader, LIMIETEN.preheader),
      blokken,
      doelgroep: normaliseerDoelgroep(o.doelgroep),
      trigger,
      vertraging_dagen: normaliseerVertraging(o.vertraging_dagen),
      ab,
    },
    fouten,
  };
}

export type OpslaanResultaat = Uitkomst<{ bericht: string; inhoud: MailInhoud; problemen: string[]; actief: boolean }>;

/** Slaat naam, onderwerp, inhoud en doelgroep (of het moment, bij een automatische mail) op. */
export async function slaMailOp(id: string, ruw: unknown): Promise<OpslaanResultaat> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende mail."] };
  const c = await haalCampagne(id);
  if (!c) return { ok: false, fouten: ["Deze mail bestaat niet meer."] };

  const { inhoud, fouten } = leesInhoud(ruw);
  if (!inhoud.naam) fouten.unshift("Geef de mail een interne naam.");
  if (c.soort === "automatisch" && !inhoud.trigger) fouten.push("Kies wanneer deze mail verstuurd wordt.");
  if (fouten.length) return { ok: false, fouten };

  const problemen = verzendProblemen({ onderwerp: inhoud.onderwerp, blokken: inhoud.blokken });
  const supabase = adminClient();
  let bericht = "Opgeslagen.";
  let actief = c.actief;

  if (c.soort === "campagne") {
    const { data, error } = await supabase
      .from("nb_campagnes")
      .update({
        naam: inhoud.naam,
        onderwerp: inhoud.onderwerp,
        preheader: inhoud.preheader,
        blokken: inhoud.blokken,
        // De wachttijd van de A/B-test staat (zonder eigen kolom) in de doelgroep-JSON.
        doelgroep: doelgroepMetWachttijd(inhoud.doelgroep, inhoud.ab),
        onderwerp_b: inhoud.ab?.onderwerpB ?? null,
        ab_percentage: inhoud.ab?.percentage ?? null,
      })
      .eq("id", id)
      .in("status", ["concept", "ingepland"])
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, fouten: [`Opslaan is niet gelukt (${error.message}).`] };
    if (!data) return { ok: false, fouten: ["Deze campagne wordt al verzonden en kan niet meer worden aangepast."] };
    if (c.status === "ingepland" && problemen.length) {
      // Een ingeplande campagne die niet meer klopt, zou straks mislukken: terug naar concept.
      await supabase.from("nb_campagnes").update({ status: "concept", ingepland_op: null }).eq("id", id).eq("status", "ingepland");
      bericht = "Opgeslagen. Let op: de planning is geannuleerd, omdat de campagne nog niet klaar is om te verzenden.";
    }
  } else {
    // Een actieve automatische mail die niet meer klopt, zetten we uit.
    if (actief && problemen.length) actief = false;
    const { error } = await supabase
      .from("nb_campagnes")
      .update({
        naam: inhoud.naam,
        onderwerp: inhoud.onderwerp,
        preheader: inhoud.preheader,
        blokken: inhoud.blokken,
        trigger: inhoud.trigger,
        vertraging_dagen: inhoud.vertraging_dagen,
        actief,
      })
      .eq("id", id);
    if (error) return { ok: false, fouten: [`Opslaan is niet gelukt (${error.message}).`] };
    if (c.actief && !actief) bericht = "Opgeslagen. De automatische mail is uitgezet, omdat er nog iets ontbreekt.";
  }

  revalidatePath("/admin/nieuwsbrief", "layout");
  return { ok: true, bericht, inhoud, problemen, actief };
}

/** Hoeveel aangemelde contacten er in een doelgroep vallen. */
export async function telOntvangers(doelgroep: Doelgroep): Promise<Uitkomst<{ aantal: number }>> {
  await vereisBeheerder("nieuwsbrief");
  try {
    const ontvangers = await zoekOntvangers(normaliseerDoelgroep(doelgroep));
    return { ok: true, aantal: ontvangers.length };
  } catch (e) {
    return { ok: false, fouten: [`Tellen is niet gelukt (${e instanceof Error ? e.message : "onbekend"}).`] };
  }
}

/** Stuurt de huidige (ook niet opgeslagen) versie als test naar één adres. */
export async function stuurTest(
  ruw: { onderwerp: string; preheader: string; blokken: Blok[] },
  naar: string,
): Promise<Uitkomst<{ bericht: string }>> {
  const gebruiker = await vereisBeheerder("nieuwsbrief");
  const adres = normaliseerEmail(String(naar ?? ""));
  if (!adres) return { ok: false, fouten: ["Vul een geldig e-mailadres in."] };
  const { inhoud, fouten } = leesInhoud(ruw);
  if (fouten.length) return { ok: false, fouten };
  if (!inhoud.blokken.length) return { ok: false, fouten: ["De mail is nog leeg."] };
  try {
    const naam = typeof gebruiker.user_metadata?.naam === "string" ? gebruiker.user_metadata.naam : null;
    await stuurTestmail(
      { onderwerp: inhoud.onderwerp || "(geen onderwerp)", preheader: inhoud.preheader, blokken: inhoud.blokken },
      adres,
      naam,
    );
  } catch (e) {
    return { ok: false, fouten: [`De testmail kon niet worden verstuurd (${e instanceof Error ? e.message : "onbekend"}).`] };
  }
  return { ok: true, bericht: `Testmail verstuurd naar ${adres}. Kijk ook even in je spammap.` };
}

/**
 * Stap 1 van een afbeelding uploaden: een eenmalige upload-URL. De browser uploadt
 * daarna rechtstreeks naar de openbare bucket; de bucket bewaakt ook type en grootte.
 */
export async function maakAfbeeldingUpload(
  type: string,
  grootte: number,
): Promise<Uitkomst<{ pad: string; token: string; url: string }>> {
  await vereisBeheerder("nieuwsbrief");
  const ext = AFBEELDING_TYPES[type];
  if (!ext) return { ok: false, fouten: ["Kies een afbeelding van het type JPG, PNG, GIF of WebP."] };
  if (!(grootte > 0) || grootte > AFBEELDING_MAX_BYTES) {
    return { ok: false, fouten: ["De afbeelding is te groot. Kies een bestand van maximaal 5 MB."] };
  }
  const pad = `afbeeldingen/${randomUUID()}.${ext}`;
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(pad);
  if (error || !data) return { ok: false, fouten: [`Uploaden is niet gelukt (${error?.message ?? "onbekend"}).`] };
  const url = supabase.storage.from(BUCKET).getPublicUrl(pad).data.publicUrl;
  return { ok: true, pad, token: data.token, url };
}
