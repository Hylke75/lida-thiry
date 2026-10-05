import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "../supabase/admin";
import { afzender, resend } from "../resend";
import { leesInstellingen } from "../instellingen";
import { renderNieuwsbrief, valideerBlokken, controleerVoorVerzenden, type Blok } from "./blokken";
import { normaliseerDoelgroep } from "./doelgroep";
import { zoekOntvangers, CONTACT_VELDEN, type Contact } from "./contacten";
import { afmeldEndpoint, afmeldPagina, klikUrl, pixelUrl } from "./links";
import { beginVanDag } from "./tijd";
import { daglimietBereikt, isTijdelijkeLimiet, koppelBatchUitkomst } from "./verzendregels";
import { registreerFout } from "../fouten/registreer";
import {
  abActief,
  abWachtUren,
  bepaalWinnaar,
  LEGE_VARIANT,
  magBeslissen,
  onderwerpVoor,
  splitsTestgroep,
  type Variant,
  type VariantCijfers,
} from "./ab-test";

/** Resend accepteert maximaal 100 mails per batch-aanroep. */
const BATCH = 100;

export interface Campagne {
  id: string;
  soort: "campagne" | "automatisch";
  naam: string;
  onderwerp: string;
  preheader: string;
  blokken: Blok[];
  doelgroep: Record<string, unknown>;
  status: "concept" | "ingepland" | "bezig" | "verzonden" | "gepauzeerd";
  ingepland_op: string | null;
  gestart_op: string | null;
  verzonden_op: string | null;
  trigger: "aanmelding" | "advies" | null;
  vertraging_dagen: number;
  actief: boolean;
  /** Sinds wanneer de automatisering aanstaat (gezet door de database). */
  actief_sinds: string | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
  /** A/B-test: tweede onderwerp (leeg/null = geen test). */
  onderwerp_b: string | null;
  /** A/B-test: deel van de doelgroep in de testgroep (A en B samen), 10–50. */
  ab_percentage: number | null;
  /** A/B-test: het gekozen onderwerp (null = nog niet gekozen). */
  ab_winnaar: Variant | null;
}

export const CAMPAGNE_VELDEN =
  "id, soort, naam, onderwerp, preheader, blokken, doelgroep, status, ingepland_op, gestart_op, verzonden_op, trigger, vertraging_dagen, actief, actief_sinds, aangemaakt_op, bijgewerkt_op, onderwerp_b, ab_percentage, ab_winnaar";

interface Huisstijl {
  afzender: { naam: string; adres: string | null };
  replyTo?: string;
  meten: boolean;
  maxPerDag: number;
}

async function huisstijl(): Promise<Huisstijl> {
  const i = await leesInstellingen();
  const max = Number(i.nb_max_per_dag);
  return {
    afzender: {
      naam: i.bedrijfsnaam?.trim() || "Lida Thiry Imago & Kledingadvies",
      adres: i.bedrijf_adres?.trim() || null,
    },
    replyTo: i.contact_email?.trim() || undefined,
    meten: (i.nb_meten ?? "ja") !== "nee",
    maxPerDag: Number.isFinite(max) && max > 0 ? Math.floor(max) : 100,
  };
}

export async function haalCampagne(id: string): Promise<Campagne | null> {
  const { data } = await adminClient().from("nb_campagnes").select(CAMPAGNE_VELDEN).eq("id", id).maybeSingle();
  return (data as Campagne | null) ?? null;
}

/** Wat er nog ontbreekt om deze campagne te verzenden (leeg = klaar). */
export function verzendProblemen(c: Pick<Campagne, "onderwerp" | "blokken">): string[] {
  const { blokken, fouten } = valideerBlokken(c.blokken);
  return [...fouten, ...controleerVoorVerzenden({ onderwerp: c.onderwerp, blokken })];
}

/**
 * Zet een campagne in de wachtrij: één verzending per ontvanger in de doelgroep.
 * Geeft het aantal ontvangers terug. Verzenden gebeurt door verwerkWachtrij().
 * Met een A/B-test van het onderwerp gaat eerst alleen de testgroep in de
 * wachtrij (zie ab-test.ts en kiesAbWinnaar()).
 */
export async function startCampagne(
  id: string,
): Promise<{ ok: true; aantal: number; /** A/B-test: grootte van de testgroep (A en B samen). */ testgroep?: number } | { ok: false; fouten: string[] }> {
  const c = await haalCampagne(id);
  if (!c || c.soort !== "campagne") return { ok: false, fouten: ["Campagne niet gevonden."] };
  if (c.status === "bezig" || c.status === "verzonden") return { ok: false, fouten: ["Deze campagne is al verzonden."] };
  const problemen = verzendProblemen(c);
  if (problemen.length) return { ok: false, fouten: problemen };

  const supabase = adminClient();
  // Eerst claimen (alleen als nog niet gestart), zodat dubbel klikken niets dubbel doet.
  // wachtrij_gevuld_op blijft leeg tot de hele doelgroep in de wachtrij staat: zolang
  // rondt rondCampagnesAf() de campagne niet af, ook al is de wachtrij even leeg.
  const { data: geclaimd } = await supabase
    .from("nb_campagnes")
    .update({ status: "bezig", gestart_op: new Date().toISOString(), wachtrij_gevuld_op: null })
    .eq("id", id)
    .in("status", ["concept", "ingepland"])
    .select("id")
    .maybeSingle();
  if (!geclaimd) return { ok: false, fouten: ["Deze campagne wordt al verzonden."] };

  let winnaarGezet = false;
  try {
    const ontvangers = await zoekOntvangers(normaliseerDoelgroep(c.doelgroep));
    // A/B-test: eerst alleen de testgroep (A en B); de rest volgt na de keuze van de winnaar.
    const test = abActief(c) && !c.ab_winnaar ? splitsTestgroep(ontvangers, c.ab_percentage!) : null;
    if (abActief(c) && !c.ab_winnaar && !test && ontvangers.length) {
      // Te weinig ontvangers voor een test: iedereen krijgt onderwerp A.
      const { error } = await supabase.from("nb_campagnes").update({ ab_winnaar: "a" }).eq("id", id);
      if (error) throw new Error(`A/B-test: ${error.message}`);
      winnaarGezet = true;
    }
    const wachtrij: { o: (typeof ontvangers)[number]; variant: Variant | null }[] = test
      ? [...test.a.map((o) => ({ o, variant: "a" as const })), ...test.b.map((o) => ({ o, variant: "b" as const }))]
      : ontvangers.map((o) => ({ o, variant: null }));
    await vulWachtrij(
      id,
      wachtrij.map(({ o, variant }) => ({ contact_id: o.id, email: o.email, ...(variant ? { variant } : {}) })),
    );
    const nu = new Date().toISOString();
    const { error } = await supabase
      .from("nb_campagnes")
      .update(ontvangers.length === 0 ? { status: "verzonden", verzonden_op: nu, wachtrij_gevuld_op: nu } : { wachtrij_gevuld_op: nu })
      .eq("id", id);
    if (error) throw new Error(`campagne bijwerken: ${error.message}`);
    return { ok: true, aantal: ontvangers.length, ...(test ? { testgroep: test.a.length + test.b.length } : {}) };
  } catch (e) {
    // Terugdraaien: weer concept/ingepland, zonder half gevulde wachtrij. Wat al
    // verstuurd is, blijft staan (een nieuwe start slaat die ontvangers over).
    await supabase.from("nb_verzendingen").delete().eq("campagne_id", id).eq("status", "wachtrij");
    await supabase
      .from("nb_campagnes")
      .update({
        status: c.status,
        gestart_op: c.gestart_op,
        wachtrij_gevuld_op: null,
        ...(winnaarGezet ? { ab_winnaar: null } : {}),
      })
      .eq("id", id)
      .eq("status", "bezig");
    throw e;
  }
}

/** Zet verzendingen in de wachtrij (in blokken; bestaande ontvangers worden overgeslagen). */
async function vulWachtrij(
  campagneId: string,
  rijen: readonly { contact_id: string; email: string; variant?: Variant }[],
): Promise<void> {
  const supabase = adminClient();
  for (let i = 0; i < rijen.length; i += 500) {
    const deel = rijen.slice(i, i + 500).map((r) => ({ campagne_id: campagneId, ...r }));
    const { error } = await supabase.from("nb_verzendingen").upsert(deel, { onConflict: "campagne_id,contact_id", ignoreDuplicates: true });
    if (error) throw new Error(`wachtrij vullen: ${error.message}`);
  }
}

// A/B-test ----------------------------------------------------------------------------

/** Cijfers per variant van de testgroep van een campagne. */
export async function variantCijfers(campagneId: string): Promise<Record<Variant, VariantCijfers>> {
  const supabase = adminClient();
  const tel = async (variant: Variant): Promise<VariantCijfers> => {
    const basis = () =>
      supabase.from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("campagne_id", campagneId).eq("variant", variant);
    const [verzonden, geopend, geklikt, wachtrij, laatste] = await Promise.all([
      basis().eq("status", "verzonden"),
      basis().eq("status", "verzonden").not("geopend_op", "is", null),
      basis().eq("status", "verzonden").not("geklikt_op", "is", null),
      basis().in("status", ["wachtrij", "verwerken"]),
      supabase
        .from("nb_verzendingen")
        .select("verzonden_op")
        .eq("campagne_id", campagneId)
        .eq("variant", variant)
        .not("verzonden_op", "is", null)
        .order("verzonden_op", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    for (const q of [verzonden, geopend, geklikt, wachtrij]) if (q.error) throw new Error(`A/B-cijfers: ${q.error.message}`);
    return {
      ...LEGE_VARIANT,
      verzonden: verzonden.count ?? 0,
      geopend: geopend.count ?? 0,
      geklikt: geklikt.count ?? 0,
      wachtrij: wachtrij.count ?? 0,
      laatsteVerzonden: (laatste.data?.verzonden_op as string | undefined) ?? null,
    };
  };
  const [a, b] = await Promise.all([tel("a"), tel("b")]);
  return { a, b };
}

export type WinnaarUitkomst =
  | { ok: true; winnaar: Variant; reden: "open" | "klik" | "gelijk"; aantal: number }
  | { ok: false; fout: string };

/**
 * Kiest de winnaar van de A/B-test en zet de rest van de doelgroep in de wachtrij
 * met het winnende onderwerp. Zonder `direct` alleen als de testgroep verstuurd
 * is en de wachttijd voorbij is. Veilig bij gelijktijdig aanroepen: de winnaar
 * wordt maar één keer gezet.
 */
export async function kiesAbWinnaar(id: string, opties: { direct?: boolean } = {}): Promise<WinnaarUitkomst> {
  const c = await haalCampagne(id);
  if (!c || c.soort !== "campagne" || !abActief(c)) return { ok: false, fout: "Deze campagne heeft geen A/B-test." };
  if (c.ab_winnaar) return { ok: false, fout: "De winnaar is al gekozen." };
  if (!["bezig", "gepauzeerd"].includes(c.status)) return { ok: false, fout: "De test is nog niet gestart." };
  const cijfers = await variantCijfers(id);
  if (!opties.direct && !magBeslissen(cijfers.a, cijfers.b, abWachtUren(c.doelgroep))) {
    return { ok: false, fout: "De wachttijd is nog niet voorbij." };
  }
  const { winnaar, reden } = bepaalWinnaar(cijfers.a, cijfers.b);
  const supabase = adminClient();
  const { data: gezet } = await supabase
    .from("nb_campagnes")
    .update({ ab_winnaar: winnaar, wachtrij_gevuld_op: null })
    .eq("id", id)
    .is("ab_winnaar", null)
    .select("id")
    .maybeSingle();
  if (!gezet) return { ok: false, fout: "De winnaar is al gekozen." };
  try {
    const ontvangers = await zoekOntvangers(normaliseerDoelgroep(c.doelgroep));
    await vulWachtrij(
      id,
      ontvangers.map((o) => ({ contact_id: o.id, email: o.email })),
    );
    const { error } = await supabase.from("nb_campagnes").update({ wachtrij_gevuld_op: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(`campagne bijwerken: ${error.message}`);
    // Wie al in de testgroep zat, staat er al in; het aantal nieuwe telt de rest.
    const { count } = await supabase
      .from("nb_verzendingen")
      .select("id", { count: "exact", head: true })
      .eq("campagne_id", id)
      .is("variant", null);
    return { ok: true, winnaar, reden, aantal: count ?? 0 };
  } catch (e) {
    // Terugdraaien, zodat de volgende ronde het opnieuw probeert.
    // De testgroep stond al volledig in de wachtrij.
    await supabase.from("nb_campagnes").update({ ab_winnaar: null, wachtrij_gevuld_op: new Date().toISOString() }).eq("id", id);
    throw e;
  }
}

/** Kiest de winnaar voor lopende A/B-tests waarvan de wachttijd voorbij is. */
export async function beslisAbTesten(): Promise<number> {
  const { data } = await adminClient()
    .from("nb_campagnes")
    .select("id")
    .eq("soort", "campagne")
    .eq("status", "bezig")
    .not("onderwerp_b", "is", null)
    .not("ab_percentage", "is", null)
    .is("ab_winnaar", null);
  let n = 0;
  for (const r of data ?? []) {
    try {
      const u = await kiesAbWinnaar(r.id);
      if (u.ok) n++;
    } catch (e) {
      console.error("A/B-test: winnaar kiezen mislukt", r.id, e);
    }
  }
  return n;
}

/** Start ingeplande campagnes waarvan het moment is aangebroken. */
export async function startIngeplande(): Promise<number> {
  const { data } = await adminClient()
    .from("nb_campagnes")
    .select("id")
    .eq("status", "ingepland")
    .lte("ingepland_op", new Date().toISOString());
  let n = 0;
  for (const r of data ?? []) {
    // Eén mislukte campagne mag de rest van de ronde niet tegenhouden.
    try {
      const u = await startCampagne(r.id);
      if (u.ok) n++;
    } catch (e) {
      console.error("Ingeplande campagne starten mislukt", r.id, e);
      await registreerFout({ bron: "cron", fout: e, pad: "/api/nb/verwerk", details: { onderdeel: "campagne starten", campagne: r.id } });
    }
  }
  return n;
}

/**
 * Plant automatische mails in: voor elke actieve automatisering de aangemelde
 * contacten bij wie het startmoment + vertraging voorbij is en die deze mail nog
 * niet kregen. Alleen startmomenten sinds het aanzetten tellen mee, zodat een
 * nieuwe automatisering niet ineens alle oude contacten mailt.
 */
export async function planAutomatiseringen(): Promise<number> {
  const supabase = adminClient();
  const { data: autos } = await supabase
    .from("nb_campagnes")
    .select(CAMPAGNE_VELDEN)
    .eq("soort", "automatisch")
    .eq("actief", true);
  let gepland = 0;
  for (const a of (autos ?? []) as Campagne[]) {
    // Eén mislukte automatisering mag de rest (en het verzenden) niet tegenhouden.
    try {
      if (verzendProblemen(a).length) continue;
      const grens = new Date(Date.now() - a.vertraging_dagen * 86_400_000);
      if (!a.actief_sinds) continue;
      const vanaf = new Date(a.actief_sinds);
      if (vanaf > grens) continue;
      // De database kiest wie de mail nog niet kreeg (anti-join op nb_verzendingen),
      // zodat dit niet vastloopt zodra er meer dan 1000 kandidaten zijn geweest.
      const { data: kandidaten, error: fout } = await supabase.rpc("nb_automatisering_kandidaten", {
        p_campagne: a.id,
        p_vanaf: vanaf.toISOString(),
        p_grens: grens.toISOString(),
        p_max: 1000,
      });
      if (fout) throw new Error(`kandidaten zoeken: ${fout.message}`);
      const lijst = (kandidaten ?? []) as { id: string; email: string }[];
      if (!lijst.length) continue;
      const { data: ingevoegd, error } = await supabase
        .from("nb_verzendingen")
        .upsert(
          lijst.map((k) => ({ campagne_id: a.id, contact_id: k.id, email: k.email })),
          { onConflict: "campagne_id,contact_id", ignoreDuplicates: true },
        )
        .select("id");
      if (error) throw new Error(error.message);
      gepland += ingevoegd?.length ?? 0;
    } catch (e) {
      console.error("Automatische mail inplannen mislukt", a.id, e);
      await registreerFout({
        bron: "cron",
        fout: e instanceof Error ? new Error(`automatisering ${a.naam}: ${e.message}`) : e,
        pad: "/api/nb/verwerk",
        details: { onderdeel: "automatisering inplannen", campagne: a.id },
      });
    }
  }
  return gepland;
}

/**
 * Hoeveel van de daglimiet vandaag (Nederlandse kalenderdag) al op is: verzonden
 * mails plus mails die nu verstuurd worden (status 'verwerken'), zodat
 * overlappende rondes samen niet over de limiet gaan.
 */
async function verbruiktVandaag(): Promise<number> {
  const supabase = adminClient();
  const [verzonden, bezig] = await Promise.all([
    supabase
      .from("nb_verzendingen")
      .select("id", { count: "exact", head: true })
      .eq("status", "verzonden")
      .gte("verzonden_op", beginVanDag().toISOString()),
    supabase.from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("status", "verwerken"),
  ]);
  if (verzonden.error) throw new Error(`daglimiet tellen: ${verzonden.error.message}`);
  if (bezig.error) throw new Error(`daglimiet tellen: ${bezig.error.message}`);
  return (verzonden.count ?? 0) + (bezig.count ?? 0);
}

async function nogInWachtrij(): Promise<number> {
  const { count } = await adminClient().from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("status", "wachtrij");
  return count ?? 0;
}

export interface WachtrijResultaat {
  verzonden: number;
  mislukt: number;
  overgeslagen: number;
  /** De daglimiet (of de limiet van Resend) is bereikt; de rest gaat bij een volgende ronde. */
  limietBereikt: boolean;
}

/**
 * Verstuurt mails uit de wachtrij, in batches van 100 via Resend, binnen de
 * daglimiet (instelling nb_max_per_dag, per Nederlandse kalenderdag). Veilig om
 * vaak en gelijktijdig aan te roepen: de database claimt verzendingen atomair en
 * bewaakt daarbij zelf de daglimiet (nb_claim_verzendingen met advisory lock).
 */
export async function verwerkWachtrij(opties: { max?: number } = {}): Promise<WachtrijResultaat> {
  const supabase = adminClient();
  const uit: WachtrijResultaat = { verzonden: 0, mislukt: 0, overgeslagen: 0, limietBereikt: false };
  // Elk onderdeel apart: een fout in het ene mag het verzenden niet tegenhouden.
  for (const [onderdeel, stap] of [
    ["ingeplande campagnes starten", startIngeplande],
    ["A/B-testen beslissen", beslisAbTesten],
    ["automatische mails inplannen", planAutomatiseringen],
  ] as const) {
    try {
      await stap();
    } catch (e) {
      console.error(`Nieuwsbrief: ${onderdeel} mislukt`, e);
      await registreerFout({ bron: "cron", fout: e, pad: "/api/nb/verwerk", details: { onderdeel } });
    }
  }

  const stijl = await huisstijl();
  const ruimte = stijl.maxPerDag - (await verbruiktVandaag());
  const max = Math.min(opties.max ?? 500, ruimte);
  if (max <= 0) {
    uit.limietBereikt = (await nogInWachtrij()) > 0;
    return uit;
  }

  // De database telt de daglimiet opnieuw (onder een lock), zodat gelijktijdige
  // rondes samen nooit meer dan de limiet claimen.
  const { data: geclaimd, error } = await supabase.rpc("nb_claim_verzendingen", {
    p_max: max,
    p_dag_limiet: stijl.maxPerDag,
    p_dag_start: beginVanDag().toISOString(),
  });
  if (error) throw new Error(`wachtrij claimen: ${error.message}`);
  const rijen = (geclaimd ?? []) as {
    id: string;
    campagne_id: string;
    contact_id: string | null;
    email: string;
    variant?: Variant | null;
  }[];
  if (!rijen.length) {
    await rondCampagnesAf();
    uit.limietBereikt = await limietTegenhoudt(stijl.maxPerDag);
    return uit;
  }

  const campagnes = new Map<string, Campagne>();
  for (const id of new Set(rijen.map((r) => r.campagne_id))) {
    const c = await haalCampagne(id);
    if (c) campagnes.set(id, c);
  }
  const contactIds = rijen.map((r) => r.contact_id).filter((x): x is string => !!x);
  const contacten = new Map<string, Contact>();
  for (let i = 0; i < contactIds.length; i += 200) {
    const { data } = await supabase.from("nb_contacten").select(CONTACT_VELDEN).in("id", contactIds.slice(i, i + 200));
    for (const c of (data ?? []) as Contact[]) contacten.set(c.id, c);
  }

  // Wie niet meer aangemeld is (afgemeld sinds het inplannen), slaan we over.
  const teVersturen: { rij: (typeof rijen)[number]; contact: Contact; campagne: Campagne }[] = [];
  const overslaan: string[] = [];
  for (const rij of rijen) {
    const contact = rij.contact_id ? contacten.get(rij.contact_id) : undefined;
    const campagne = campagnes.get(rij.campagne_id);
    if (!contact || !campagne || contact.status !== "aangemeld") overslaan.push(rij.id);
    else teVersturen.push({ rij, contact, campagne });
  }
  if (overslaan.length) {
    await supabase.from("nb_verzendingen").update({ status: "overgeslagen" }).in("id", overslaan);
    uit.overgeslagen = overslaan.length;
  }

  let gestopt: string | null = null;
  for (let i = 0; i < teVersturen.length; i += BATCH) {
    const deel = teVersturen.slice(i, i + BATCH);
    const ids = deel.map((d) => d.rij.id);
    if (gestopt) {
      // Resend gaf eerder in deze ronde een limiet: niet verder proberen.
      await zetTerugInWachtrij(ids, gestopt);
      continue;
    }
    const mails = deel.map(({ rij, contact, campagne }) => {
      const { blokken } = valideerBlokken(campagne.blokken);
      const r = renderNieuwsbrief({
        // Bij een A/B-test: het onderwerp van de variant (of de winnaar voor de rest).
        onderwerp: onderwerpVoor(campagne, rij.variant),
        preheader: campagne.preheader,
        blokken,
        ontvanger: contact,
        afmeldUrl: afmeldPagina(contact.token) + `?v=${rij.id}`,
        afzender: stijl.afzender,
        volgLink: stijl.meten ? (url) => klikUrl(rij.id, url) : undefined,
        pixelUrl: stijl.meten ? pixelUrl(rij.id) : undefined,
      });
      return {
        from: afzender(),
        to: contact.email,
        subject: r.onderwerp,
        html: r.html,
        text: r.tekst,
        ...(stijl.replyTo ? { replyTo: stijl.replyTo } : {}),
        headers: {
          "List-Unsubscribe": `<${afmeldEndpoint(contact.token)}?v=${rij.id}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        tags: [{ name: "campagne", value: campagne.id }],
      };
    });
    const sleutel = createHash("sha256").update(deel.map((d) => d.rij.id).sort().join(",")).digest("hex");
    let antwoord;
    try {
      // 'permissive': één ongeldig adres laat niet de hele batch mislukken.
      antwoord = await resend().batch.send(mails, { idempotencyKey: `nb-${sleutel}`, batchValidation: "permissive" });
    } catch (e) {
      antwoord = { data: null, error: { message: e instanceof Error ? e.message : String(e), statusCode: null, name: "application_error" as const } };
    }
    if (antwoord.error) {
      const melding = antwoord.error.message;
      if (isTijdelijkeLimiet(antwoord.error)) {
        // Limiet of quotum van Resend: laten staan voor een volgende ronde.
        gestopt = `Uitgesteld (limiet van Resend): ${melding}`.slice(0, 500);
        await zetTerugInWachtrij(ids, gestopt);
        uit.limietBereikt = true;
        continue;
      }
      const { error: fout } = await supabase.from("nb_verzendingen").update({ status: "mislukt", fout: melding.slice(0, 500) }).in("id", ids);
      if (fout) console.error("Nieuwsbrief: status 'mislukt' opslaan mislukt", fout.message);
      uit.mislukt += deel.length;
      continue;
    }

    const uitkomsten = koppelBatchUitkomst(deel.length, antwoord.data?.data, antwoord.data?.errors);
    const verzonden: { id: string; resendId: string | null }[] = [];
    const geweigerd: { id: string; fout: string }[] = [];
    uitkomsten.forEach((u, j) => {
      if ("fout" in u) geweigerd.push({ id: ids[j], fout: u.fout });
      else verzonden.push({ id: ids[j], resendId: u.id });
    });
    if (verzonden.length) {
      // Eén statement voor de hele batch, en de fout controleren: anders blijven
      // verzonden mails op 'verwerken' staan.
      const { error: fout } = await supabase.rpc("nb_markeer_verzonden", {
        p_ids: verzonden.map((v) => v.id),
        p_resend_ids: verzonden.map((v) => v.resendId),
      });
      if (fout) {
        // De mails zijn wel verstuurd. Niet opnieuw claimen: na 30 minuten worden ze
        // 'mislukt' met de notitie "mogelijk verzonden" (zie nb_claim_verzendingen).
        console.error("Nieuwsbrief: verzonden mails registreren mislukt", fout.message);
        await registreerFout({ bron: "cron", fout: new Error(`verzonden registreren: ${fout.message}`), pad: "/api/nb/verwerk" });
      }
      uit.verzonden += verzonden.length;
    }
    for (const g of geweigerd) {
      await supabase.from("nb_verzendingen").update({ status: "mislukt", fout: g.fout.slice(0, 500) }).eq("id", g.id);
    }
    uit.mislukt += geweigerd.length;
  }

  await rondCampagnesAf();
  if (!uit.limietBereikt) uit.limietBereikt = await limietTegenhoudt(stijl.maxPerDag);
  return uit;
}

/** Zet geclaimde verzendingen terug in de wachtrij (bijv. na een limiet van Resend). */
async function zetTerugInWachtrij(ids: string[], notitie: string): Promise<void> {
  const { error } = await adminClient()
    .from("nb_verzendingen")
    .update({ status: "wachtrij", geclaimd_op: null, fout: notitie })
    .in("id", ids)
    .eq("status", "verwerken");
  if (error) console.error("Nieuwsbrief: terugzetten in de wachtrij mislukt", error.message);
}

/** Staat er nog iets in de wachtrij dat door de daglimiet moet wachten? */
async function limietTegenhoudt(maxPerDag: number): Promise<boolean> {
  try {
    const [verbruikt, wachtend] = await Promise.all([verbruiktVandaag(), nogInWachtrij()]);
    return daglimietBereikt({ maxPerDag, verbruiktVandaag: verbruikt, nogInWachtrij: wachtend });
  } catch {
    return false;
  }
}

/**
 * Zet campagnes zonder openstaande verzendingen op 'verzonden'. Alleen als de
 * wachtrij volledig gevuld is (wachtrij_gevuld_op): een campagne die nog wordt
 * klaargezet, heeft even een lege wachtrij maar is niet klaar.
 */
async function rondCampagnesAf(): Promise<void> {
  const supabase = adminClient();
  const { data: bezig } = await supabase
    .from("nb_campagnes")
    .select("id, onderwerp_b, ab_percentage, ab_winnaar")
    .eq("soort", "campagne")
    .eq("status", "bezig")
    .not("wachtrij_gevuld_op", "is", null);
  for (const c of bezig ?? []) {
    // Een A/B-test zonder winnaar is niet klaar: de rest van de doelgroep moet nog.
    if (abActief(c) && !c.ab_winnaar) continue;
    const { count } = await supabase
      .from("nb_verzendingen")
      .select("id", { count: "exact", head: true })
      .eq("campagne_id", c.id)
      .in("status", ["wachtrij", "verwerken"]);
    if ((count ?? 0) === 0) {
      await supabase
        .from("nb_campagnes")
        .update({ status: "verzonden", verzonden_op: new Date().toISOString() })
        .eq("id", c.id)
        .eq("status", "bezig");
    }
  }
}

/** Zet mislukte verzendingen van een campagne terug in de wachtrij. */
export async function probeerMisluktOpnieuw(campagneId: string): Promise<number> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("nb_verzendingen")
    .update({ status: "wachtrij", fout: null })
    .eq("campagne_id", campagneId)
    .eq("status", "mislukt")
    .select("id");
  if (data?.length) {
    await supabase.from("nb_campagnes").update({ status: "bezig" }).eq("id", campagneId).eq("status", "verzonden");
  }
  return data?.length ?? 0;
}

/**
 * Stuurt een testversie naar één adres (zonder meting; de afmeldlink is een
 * voorbeeld). Werkt ook voor nog niet opgeslagen inhoud.
 */
export async function stuurTestmail(
  c: Pick<Campagne, "onderwerp" | "preheader" | "blokken">,
  naar: string,
  ontvangerNaam?: string | null,
): Promise<void> {
  const stijl = await huisstijl();
  const { blokken } = valideerBlokken(c.blokken);
  const r = renderNieuwsbrief({
    onderwerp: `[Test] ${c.onderwerp}`,
    preheader: c.preheader,
    blokken,
    ontvanger: { naam: ontvangerNaam ?? null, email: naar },
    afmeldUrl: afmeldPagina("0".repeat(64)),
    afzender: stijl.afzender,
  });
  const { error } = await resend().emails.send({
    from: afzender(),
    to: naar,
    subject: r.onderwerp,
    html: r.html,
    text: r.tekst,
    ...(stijl.replyTo ? { replyTo: stijl.replyTo } : {}),
  });
  if (error) throw new Error(error.message);
}
