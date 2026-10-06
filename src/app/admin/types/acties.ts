"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls } from "@/lib/beeldbank";
import { ONDERDELEN } from "@/lib/beeldbank-regels";
import {
  hernummerPlan,
  ontleedSleutel,
  verplaats,
  verwijderOp,
} from "@/lib/adviestypes-beheer";
import type { GevondenBeeld, Uitkomst } from "./uitkomst";
import { veiligeZoekterm } from "@/lib/zoeken/regels";

type Supabase = ReturnType<typeof adminClient>;

const ok = (melding: string, anker?: string): Uitkomst => ({ ok: true, melding, anker, tijd: Date.now() });
const fout = (melding: string): Uitkomst => ({ ok: false, melding, tijd: Date.now() });

const tekst = (fd: FormData, naam: string) => String(fd.get(naam) ?? "");
const nu = () => new Date().toISOString();

/** Ververst de editor en de lijst. */
function ververs(sleutel?: string) {
  revalidatePath("/admin/types");
  if (sleutel) revalidatePath(`/admin/types/${sleutel}`);
  else revalidatePath("/admin/types/[sleutel]", "page");
}

/** Zet 'laatst bewerkt' van een of meer types op nu. */
async function raakAan(supabase: Supabase, sleutels: string[]) {
  if (sleutels.length) await supabase.from("adviestypes").update({ bijgewerkt_op: nu() }).in("sleutel", sleutels);
}

async function typeBestaat(supabase: Supabase, sleutel: string): Promise<boolean> {
  if (!ontleedSleutel(sleutel)) return false;
  const { data } = await supabase.from("adviestypes").select("sleutel").eq("sleutel", sleutel).maybeSingle();
  return Boolean(data);
}

/** Controleert dat de sectie bij dit type hoort. */
async function sectieVanType(supabase: Supabase, sleutel: string, sectieId: string) {
  if (!sectieId) return null;
  const { data } = await supabase
    .from("adviessecties")
    .select("id, volgorde, kop, tekst, veld_sleutel")
    .eq("id", sectieId)
    .eq("type_sleutel", sleutel)
    .maybeSingle();
  return data as { id: string; volgorde: number; kop: string; tekst: string; veld_sleutel: string | null } | null;
}

/** Beeldkoppelingen van een sectie in volgorde. */
async function koppelingenVan(supabase: Supabase, sectieId: string) {
  const { data, error } = await supabase
    .from("sectie_beelden")
    .select("volgorde, beeld_id")
    .eq("sectie_id", sectieId)
    .order("volgorde", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as { volgorde: number; beeld_id: string }[];
}

/** Geeft de beeldkoppelingen van een sectie hun nieuwe volgorde (twee rondes). */
async function hernummerKoppelingen(
  supabase: Supabase,
  sectieId: string,
  gewenst: { volgorde: number }[],
) {
  const plan = hernummerPlan(gewenst, (k) => k.volgorde);
  const resultaten1 = await Promise.all(
    plan.map((s) =>
      supabase
        .from("sectie_beelden")
        .update({ volgorde: s.tijdelijk })
        .eq("sectie_id", sectieId)
        .eq("volgorde", s.oud),
    ),
  );
  const fout1 = resultaten1.find((r) => r.error);
  if (fout1?.error) throw new Error(fout1.error.message);
  const resultaten2 = await Promise.all(
    plan.map((s) =>
      supabase
        .from("sectie_beelden")
        .update({ volgorde: s.naar })
        .eq("sectie_id", sectieId)
        .eq("volgorde", s.tijdelijk),
    ),
  );
  const fout2 = resultaten2.find((r) => r.error);
  if (fout2?.error) throw new Error(fout2.error.message);
}

async function sectieGewijzigd(supabase: Supabase, sleutel: string, sectieId: string) {
  await supabase.from("adviessecties").update({ bijgewerkt_op: nu() }).eq("id", sectieId);
  await raakAan(supabase, [sleutel]);
}

/** Voert een actie uit en vertaalt onverwachte fouten naar een begrijpelijke melding. */
async function veilig(werk: () => Promise<Uitkomst>): Promise<Uitkomst> {
  try {
    return await werk();
  } catch (e) {
    console.error("[adviestypes]", e);
    return fout("Er ging iets mis bij het opslaan. Vernieuw de pagina en probeer het opnieuw.");
  }
}

// ---------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------

export async function slaTypeOp(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    const titel = tekst(fd, "titel").trim();
    if (!titel) return fout("Vul een titel in.");
    if (!(await typeBestaat(supabase, sleutel))) return fout("Dit adviestype bestaat niet (meer).");
    const { error } = await supabase
      .from("adviestypes")
      .update({
        titel,
        lengte_label: tekst(fd, "lengte_label").trim() || null,
        maat_label: tekst(fd, "maat_label").trim() || null,
        bijgewerkt_op: nu(),
      })
      .eq("sleutel", sleutel);
    if (error) throw new Error(error.message);
    ververs(sleutel);
    return ok("De gegevens zijn opgeslagen.");
  });
}

// ---------------------------------------------------------------------------
// Secties
// ---------------------------------------------------------------------------

export async function slaSectieOp(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    const sectie = await sectieVanType(supabase, sleutel, tekst(fd, "sectie_id"));
    if (!sectie) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    const kop = tekst(fd, "kop").trim() || sectie.kop;
    // Windows-regeleinden gelijktrekken; spaties aan het eind van regels weg.
    const inhoud = tekst(fd, "tekst").replace(/\r\n?/g, "\n").replace(/[ \t]+$/gm, "").trim();
    const { error } = await supabase
      .from("adviessecties")
      .update({ kop, tekst: inhoud, bijgewerkt_op: nu() })
      .eq("id", sectie.id);
    if (error) throw new Error(error.message);
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok("Opgeslagen.");
  });
}

export async function verwijderSectie(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    const sectie = await sectieVanType(supabase, sleutel, tekst(fd, "sectie_id"));
    if (!sectie) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    // De beeldkoppelingen gaan mee (de beelden zelf blijven in de beeldbank).
    const { error: e1 } = await supabase.from("sectie_beelden").delete().eq("sectie_id", sectie.id);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("adviessecties").delete().eq("id", sectie.id);
    if (e2) throw new Error(e2.message);
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok(`'${sectie.kop}' is leeggemaakt en uit dit type gehaald.`);
  });
}

/** Maakt de (nog lege) sectie voor een veld van het sjabloon aan. */
export async function vulVeld(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    if (!(await typeBestaat(supabase, sleutel))) return fout("Dit adviestype bestaat niet (meer).");
    const veld = await veldVan(supabase, tekst(fd, "veld"));
    if (!veld) return fout("Dit veld bestaat niet.");
    const { data: bestaand } = await supabase
      .from("adviessecties")
      .select("id")
      .eq("type_sleutel", sleutel)
      .eq("veld_sleutel", veld.sleutel)
      .maybeSingle();
    if (bestaand) return ok("Dit veld bestaat al.", `sectie-${bestaand.id}`);
    const { data: nieuw, error } = await supabase
      .from("adviessecties")
      .insert({ type_sleutel: sleutel, veld_sleutel: veld.sleutel, volgorde: veld.volgorde, kop: veld.kop, tekst: "" })
      .select("id")
      .single();
    if (error || !nieuw) throw new Error(error?.message ?? "aanmaken mislukt");
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok(`'${veld.kop}' is toegevoegd. Vul de tekst in en klik op Opslaan.`, `sectie-${nieuw.id}`);
  });
}

async function veldVan(supabase: Supabase, veldSleutel: string) {
  if (!veldSleutel) return null;
  const { data } = await supabase
    .from("advies_velden")
    .select("sleutel, kop, volgorde")
    .eq("sleutel", veldSleutel)
    .maybeSingle();
  return data as { sleutel: string; kop: string; volgorde: number } | null;
}

/**
 * Kopieert tekst en beeldkoppelingen van een veld naar hetzelfde veld in elk
 * gekozen type (bestaande inhoud van dat veld wordt vervangen).
 */
export async function kopieerSectie(sleutel: string, sectieId: string, doelen: string[]): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const bron = await sectieVanType(supabase, sleutel, sectieId);
    if (!bron) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    const gekozen = [...new Set(doelen)].filter((d) => ontleedSleutel(d));
    if (gekozen.length === 0) return fout("Kies eerst een of meer types.");

    const { data: gevonden } = await supabase.from("adviestypes").select("sleutel").in("sleutel", gekozen);
    const typen = (gevonden ?? []).map((t) => t.sleutel as string);
    if (typen.length === 0) return fout("De gekozen types bestaan niet.");

    if (!bron.veld_sleutel) return fout("Deze sectie hoort niet bij een veld van het sjabloon.");
    const koppelingen = await koppelingenVan(supabase, bron.id);
    const { data: bestaandeSecties } = await supabase
      .from("adviessecties")
      .select("id, type_sleutel")
      .eq("veld_sleutel", bron.veld_sleutel)
      .in("type_sleutel", typen);
    const bestaand = new Map((bestaandeSecties ?? []).map((r) => [r.type_sleutel as string, r.id as string]));

    // Bestaande velden overschrijven, ontbrekende aanmaken.
    const teMaken = typen.filter((t) => !bestaand.has(t));
    if (teMaken.length) {
      const { data: nieuwe, error } = await supabase
        .from("adviessecties")
        .insert(
          teMaken.map((t) => ({
            type_sleutel: t,
            veld_sleutel: bron.veld_sleutel,
            volgorde: bron.volgorde,
            kop: bron.kop,
            tekst: bron.tekst,
          })),
        )
        .select("id, type_sleutel");
      if (error || !nieuwe) throw new Error(error?.message ?? "kopiëren mislukt");
      for (const r of nieuwe) bestaand.set(r.type_sleutel as string, r.id as string);
    }
    const ids = typen.map((t) => bestaand.get(t)!);
    const { error: e1 } = await supabase
      .from("adviessecties")
      .update({ kop: bron.kop, tekst: bron.tekst, bijgewerkt_op: nu() })
      .in("id", ids);
    if (e1) throw new Error(e1.message);
    const { error: e2 } = await supabase.from("sectie_beelden").delete().in("sectie_id", ids);
    if (e2) throw new Error(e2.message);
    if (koppelingen.length) {
      const rijen = ids.flatMap((id) => koppelingen.map((k, i) => ({ sectie_id: id, volgorde: i, beeld_id: k.beeld_id })));
      const { error: e3 } = await supabase.from("sectie_beelden").insert(rijen);
      if (e3) throw new Error(e3.message);
    }
    await raakAan(supabase, typen);
    ververs();
    const lijst = typen.length <= 8 ? ` (${typen.join(", ")})` : "";
    return ok(
      `'${bron.kop}' (tekst en beelden) is overgenomen in ${typen.length} ${typen.length === 1 ? "type" : "types"}${lijst}.`,
    );
  });
}

// ---------------------------------------------------------------------------
// Beelden in een sectie
// ---------------------------------------------------------------------------

/** Zoekt de koppeling op positie `volgorde` en controleert dat het nog hetzelfde beeld is. */
async function koppelingMetControle(supabase: Supabase, fd: FormData) {
  const sleutel = tekst(fd, "sleutel");
  const sectie = await sectieVanType(supabase, sleutel, tekst(fd, "sectie_id"));
  if (!sectie) return null;
  const koppelingen = await koppelingenVan(supabase, sectie.id);
  const volgorde = Number(tekst(fd, "volgorde"));
  const index = koppelingen.findIndex((k) => k.volgorde === volgorde && k.beeld_id === tekst(fd, "beeld_id"));
  if (index < 0) return null;
  return { sleutel, sectie, koppelingen, index };
}

export async function verplaatsBeeld(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const k = await koppelingMetControle(supabase, fd);
    if (!k) return fout("Dit beeld staat niet meer op die plek. Vernieuw de pagina.");
    const richting = tekst(fd, "richting") === "links" ? -1 : 1;
    await hernummerKoppelingen(supabase, k.sectie.id, verplaats(k.koppelingen, k.index, richting));
    await sectieGewijzigd(supabase, k.sleutel, k.sectie.id);
    ververs(k.sleutel);
    return ok("Beeld verplaatst.");
  });
}

export async function verwijderBeeld(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const k = await koppelingMetControle(supabase, fd);
    if (!k) return fout("Dit beeld staat niet meer op die plek. Vernieuw de pagina.");
    const { error } = await supabase
      .from("sectie_beelden")
      .delete()
      .eq("sectie_id", k.sectie.id)
      .eq("volgorde", k.koppelingen[k.index].volgorde);
    if (error) throw new Error(error.message);
    await hernummerKoppelingen(supabase, k.sectie.id, verwijderOp(k.koppelingen, k.index));
    await sectieGewijzigd(supabase, k.sleutel, k.sectie.id);
    ververs(k.sleutel);
    return ok("Beeld uit deze sectie gehaald. Het staat nog wel in de beeldbank.");
  });
}

export async function voegBeeldToe(sleutel: string, sectieId: string, beeldId: string): Promise<Uitkomst> {
  await vereisBeheerder("advies");
  return veilig(async () => {
    const supabase = adminClient();
    const sectie = await sectieVanType(supabase, sleutel, sectieId);
    if (!sectie) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    const { data: beeld } = await supabase.from("beelden").select("id, code").eq("id", beeldId).maybeSingle();
    if (!beeld) return fout("Dit beeld bestaat niet meer in de beeldbank.");
    const koppelingen = await koppelingenVan(supabase, sectie.id);
    const volgorde = koppelingen.length ? koppelingen[koppelingen.length - 1].volgorde + 1 : 0;
    const { error } = await supabase.from("sectie_beelden").insert({ sectie_id: sectie.id, volgorde, beeld_id: beeld.id });
    if (error) throw new Error(error.message);
    await sectieGewijzigd(supabase, sleutel, sectie.id);
    ververs(sleutel);
    return ok(`Beeld ${beeld.code} is achteraan in de sectie '${sectie.kop}' gezet.`);
  });
}

/** Zoekt in de beeldbank (code, naam, omschrijving, onderdeel). Maximaal 24 resultaten. */
export async function zoekBeelden(zoek: string, onderdeel: string): Promise<GevondenBeeld[]> {
  await vereisBeheerder("advies");
  let query = adminClient()
    .from("beelden")
    .select("id, code, naam, omschrijving, onderdeel, bijschrift, pad, thumb_pad")
    .order("code", { ascending: true })
    .limit(24);
  if ((ONDERDELEN as readonly string[]).includes(onderdeel)) query = query.eq("onderdeel", onderdeel);
  // Elk woord moet ergens voorkomen.
  for (const woord of veiligeZoekterm(zoek, { max: 80, underscoreWeg: true }).split(" ").filter(Boolean)) {
    query = query.or(
      ["code", "naam", "omschrijving", "onderdeel", "bijschrift"].map((k) => `${k}.ilike.%${woord}%`).join(","),
    );
  }
  const { data, error } = await query;
  if (error) {
    console.error("[adviestypes] zoeken", error);
    return [];
  }
  type Rij = Omit<GevondenBeeld, "url"> & { pad: string; thumb_pad: string | null };
  const rijen = (data ?? []) as Rij[];
  const urls = await beeldUrls(rijen.map((r) => r.thumb_pad ?? r.pad));
  return rijen.map(({ pad, thumb_pad, ...r }) => ({ ...r, url: urls[thumb_pad ?? pad] ?? null }));
}
