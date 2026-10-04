import "server-only";
import { createHash } from "node:crypto";
import { Resend } from "resend";
import { adminClient } from "../supabase/admin";
import { leesInstellingen } from "../instellingen";
import { renderNieuwsbrief, valideerBlokken, controleerVoorVerzenden, type Blok } from "./blokken";
import { normaliseerDoelgroep } from "./doelgroep";
import { zoekOntvangers, CONTACT_VELDEN, type Contact } from "./contacten";
import { afmeldEndpoint, afmeldPagina, klikUrl, pixelUrl } from "./links";
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

function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt.");
  return new Resend(key);
}

function afzender(): string {
  return process.env.RESEND_VAN || "Lida Thiry <onboarding@resend.dev>";
}

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
  const { data: geclaimd } = await supabase
    .from("nb_campagnes")
    .update({ status: "bezig", gestart_op: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["concept", "ingepland"])
    .select("id")
    .maybeSingle();
  if (!geclaimd) return { ok: false, fouten: ["Deze campagne wordt al verzonden."] };

  const ontvangers = await zoekOntvangers(normaliseerDoelgroep(c.doelgroep));
  // A/B-test: eerst alleen de testgroep (A en B); de rest volgt na de keuze van de winnaar.
  const test = abActief(c) && !c.ab_winnaar ? splitsTestgroep(ontvangers, c.ab_percentage!) : null;
  if (abActief(c) && !c.ab_winnaar && !test && ontvangers.length) {
    // Te weinig ontvangers voor een test: iedereen krijgt onderwerp A.
    await supabase.from("nb_campagnes").update({ ab_winnaar: "a" }).eq("id", id);
  }
  const wachtrij: { o: (typeof ontvangers)[number]; variant: Variant | null }[] = test
    ? [...test.a.map((o) => ({ o, variant: "a" as const })), ...test.b.map((o) => ({ o, variant: "b" as const }))]
    : ontvangers.map((o) => ({ o, variant: null }));
  await vulWachtrij(
    id,
    wachtrij.map(({ o, variant }) => ({ contact_id: o.id, email: o.email, ...(variant ? { variant } : {}) })),
  );
  if (ontvangers.length === 0) {
    await supabase.from("nb_campagnes").update({ status: "verzonden", verzonden_op: new Date().toISOString() }).eq("id", id);
  }
  return { ok: true, aantal: ontvangers.length, ...(test ? { testgroep: test.a.length + test.b.length } : {}) };
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
    .update({ ab_winnaar: winnaar })
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
    // Wie al in de testgroep zat, staat er al in; het aantal nieuwe telt de rest.
    const { count } = await supabase
      .from("nb_verzendingen")
      .select("id", { count: "exact", head: true })
      .eq("campagne_id", id)
      .is("variant", null);
    return { ok: true, winnaar, reden, aantal: count ?? 0 };
  } catch (e) {
    // Terugdraaien, zodat de volgende ronde het opnieuw probeert.
    await supabase.from("nb_campagnes").update({ ab_winnaar: null }).eq("id", id);
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
    const u = await startCampagne(r.id);
    if (u.ok) n++;
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
    if (verzendProblemen(a).length) continue;
    const grens = new Date(Date.now() - a.vertraging_dagen * 86_400_000);
    if (!a.actief_sinds) continue;
    const vanaf = new Date(a.actief_sinds);
    if (vanaf > grens) continue;
    let kandidaten: { id: string; email: string }[] = [];

    if (a.trigger === "aanmelding") {
      const { data } = await supabase
        .from("nb_contacten")
        .select("id, email")
        .eq("status", "aangemeld")
        .lte("bevestigd_op", grens.toISOString())
        .gte("bevestigd_op", vanaf.toISOString())
        .limit(1000);
      kandidaten = data ?? [];
    } else if (a.trigger === "advies") {
      const { data: orders } = await supabase
        .from("orders")
        .select("email")
        .eq("status", "advies_verzonden")
        .lte("afgerond_op", grens.toISOString())
        .gte("afgerond_op", vanaf.toISOString())
        .limit(1000);
      const emails = [...new Set((orders ?? []).map((o) => o.email.trim().toLowerCase()))];
      for (let i = 0; i < emails.length; i += 200) {
        const { data } = await supabase
          .from("nb_contacten")
          .select("id, email")
          .eq("status", "aangemeld")
          .in("email", emails.slice(i, i + 200));
        kandidaten.push(...(data ?? []));
      }
    }
    if (!kandidaten.length) continue;
    const { data: ingevoegd, error } = await supabase
      .from("nb_verzendingen")
      .upsert(
        kandidaten.map((k) => ({ campagne_id: a.id, contact_id: k.id, email: k.email })),
        { onConflict: "campagne_id,contact_id", ignoreDuplicates: true },
      )
      .select("id");
    if (error) throw new Error(`automatisering ${a.naam}: ${error.message}`);
    gepland += ingevoegd?.length ?? 0;
  }
  return gepland;
}

async function verzondenAfgelopenEtmaal(): Promise<number> {
  const { count } = await adminClient()
    .from("nb_verzendingen")
    .select("id", { count: "exact", head: true })
    .eq("status", "verzonden")
    .gte("verzonden_op", new Date(Date.now() - 86_400_000).toISOString());
  return count ?? 0;
}

export interface WachtrijResultaat {
  verzonden: number;
  mislukt: number;
  overgeslagen: number;
  /** De daglimiet is bereikt; de rest gaat bij een volgende ronde. */
  limietBereikt: boolean;
}

/**
 * Verstuurt mails uit de wachtrij, in batches van 100 via Resend, binnen de
 * daglimiet (instelling nb_max_per_dag). Veilig om vaak en gelijktijdig aan te
 * roepen: verzendingen worden atomair geclaimd.
 */
export async function verwerkWachtrij(opties: { max?: number } = {}): Promise<WachtrijResultaat> {
  const supabase = adminClient();
  const uit: WachtrijResultaat = { verzonden: 0, mislukt: 0, overgeslagen: 0, limietBereikt: false };
  await startIngeplande();
  await beslisAbTesten();
  await planAutomatiseringen();

  const stijl = await huisstijl();
  const ruimte = stijl.maxPerDag - (await verzondenAfgelopenEtmaal());
  const max = Math.min(opties.max ?? 500, ruimte);
  if (max <= 0) {
    const { count } = await supabase.from("nb_verzendingen").select("id", { count: "exact", head: true }).eq("status", "wachtrij");
    uit.limietBereikt = (count ?? 0) > 0;
    return uit;
  }

  const { data: geclaimd, error } = await supabase.rpc("nb_claim_verzendingen", { p_max: max });
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

  for (let i = 0; i < teVersturen.length; i += BATCH) {
    const deel = teVersturen.slice(i, i + BATCH);
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
    try {
      const { data, error: fout } = await resend().batch.send(mails, { idempotencyKey: `nb-${sleutel}` });
      if (fout) throw new Error(fout.message);
      const ids = data?.data ?? [];
      const nu = new Date().toISOString();
      await Promise.all(
        deel.map(({ rij }, j) =>
          supabase
            .from("nb_verzendingen")
            .update({ status: "verzonden", verzonden_op: nu, resend_id: ids[j]?.id ?? null, fout: null })
            .eq("id", rij.id),
        ),
      );
      uit.verzonden += deel.length;
    } catch (e) {
      const melding = e instanceof Error ? e.message : String(e);
      await supabase
        .from("nb_verzendingen")
        .update({ status: "mislukt", fout: melding.slice(0, 500) })
        .in(
          "id",
          deel.map((d) => d.rij.id),
        );
      uit.mislukt += deel.length;
    }
  }

  await rondCampagnesAf();
  return uit;
}

/** Zet campagnes zonder openstaande verzendingen op 'verzonden'. */
async function rondCampagnesAf(): Promise<void> {
  const supabase = adminClient();
  const { data: bezig } = await supabase
    .from("nb_campagnes")
    .select("id, onderwerp_b, ab_percentage, ab_winnaar")
    .eq("soort", "campagne")
    .eq("status", "bezig");
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

/** HTML voor de voorbeeldweergave in het beheer (zonder meting). */
export async function voorbeeldHtml(c: Pick<Campagne, "onderwerp" | "preheader" | "blokken">): Promise<string> {
  const stijl = await huisstijl();
  const { blokken } = valideerBlokken(c.blokken);
  return renderNieuwsbrief({
    onderwerp: c.onderwerp,
    preheader: c.preheader,
    blokken,
    ontvanger: { naam: "Anna de Vries", email: "anna@voorbeeld.nl" },
    afmeldUrl: "#",
    afzender: stijl.afzender,
  }).html;
}
