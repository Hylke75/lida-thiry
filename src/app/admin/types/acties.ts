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
  veiligeZoekterm,
  verwijderOp,
  voegIn,
} from "@/lib/adviestypes-beheer";
import type { GevondenBeeld, Uitkomst } from "./uitkomst";

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

/** Secties van een type in volgorde (id + volgorde). */
async function sectiesVan(supabase: Supabase, sleutel: string) {
  const { data, error } = await supabase
    .from("adviessecties")
    .select("id, volgorde")
    .eq("type_sleutel", sleutel)
    .order("volgorde", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; volgorde: number }[];
}

/** Controleert dat de sectie bij dit type hoort. */
async function sectieVanType(supabase: Supabase, sleutel: string, sectieId: string) {
  if (!sectieId) return null;
  const { data } = await supabase
    .from("adviessecties")
    .select("id, volgorde, kop, tekst")
    .eq("id", sectieId)
    .eq("type_sleutel", sleutel)
    .maybeSingle();
  return data as { id: string; volgorde: number; kop: string; tekst: string } | null;
}

/** Geeft de secties hun nieuwe volgorde (twee rondes, zie hernummerPlan). */
async function hernummerSecties(supabase: Supabase, gewenst: { id: string; volgorde: number }[]) {
  const plan = hernummerPlan(gewenst, (s) => s.volgorde);
  for (const ronde of ["tijdelijk", "naar"] as const) {
    const resultaten = await Promise.all(
      plan.map((s) => supabase.from("adviessecties").update({ volgorde: s[ronde] }).eq("id", s.item.id)),
    );
    const mislukt = resultaten.find((r) => r.error);
    if (mislukt?.error) throw new Error(mislukt.error.message);
  }
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
  await vereisBeheerder();
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
  await vereisBeheerder();
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    const sectie = await sectieVanType(supabase, sleutel, tekst(fd, "sectie_id"));
    if (!sectie) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    const kop = tekst(fd, "kop").trim();
    if (!kop) return fout("Vul een kop in.");
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

export async function verplaatsSectie(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder();
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    const sectieId = tekst(fd, "sectie_id");
    const richting = tekst(fd, "richting") === "omhoog" ? -1 : 1;
    const secties = await sectiesVan(supabase, sleutel);
    const index = secties.findIndex((s) => s.id === sectieId);
    if (index < 0) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    await hernummerSecties(supabase, verplaats(secties, index, richting));
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok(richting < 0 ? "Sectie omhoog verplaatst." : "Sectie omlaag verplaatst.", `sectie-${sectieId}`);
  });
}

export async function verwijderSectie(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder();
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
    await hernummerSecties(supabase, await sectiesVan(supabase, sleutel));
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok(`De sectie '${sectie.kop}' is verwijderd.`);
  });
}

export async function voegSectieToe(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  await vereisBeheerder();
  return veilig(async () => {
    const supabase = adminClient();
    const sleutel = tekst(fd, "sleutel");
    if (!(await typeBestaat(supabase, sleutel))) return fout("Dit adviestype bestaat niet (meer).");
    const kop = tekst(fd, "kop").trim() || "Nieuwe sectie";
    const naSectieId = tekst(fd, "na_sectie_id");
    const secties = await sectiesVan(supabase, sleutel);
    const laatste = secties.length ? secties[secties.length - 1].volgorde : -1;

    // Eerst achteraan toevoegen (botst nooit), daarna op de juiste plek zetten.
    const { data: nieuw, error } = await supabase
      .from("adviessecties")
      .insert({ type_sleutel: sleutel, volgorde: laatste + 1, kop, tekst: "" })
      .select("id, volgorde")
      .single();
    if (error || !nieuw) throw new Error(error?.message ?? "invoegen mislukt");

    if (naSectieId) {
      const index = secties.findIndex((s) => s.id === naSectieId);
      const gewenst = voegIn(secties, index < 0 ? secties.length : index + 1, nieuw);
      await hernummerSecties(supabase, gewenst);
    } else {
      await hernummerSecties(supabase, [...secties, nieuw]);
    }
    await raakAan(supabase, [sleutel]);
    ververs(sleutel);
    return ok("Nieuwe sectie toegevoegd. Vul de kop en tekst in en klik op Opslaan.", `sectie-${nieuw.id}`);
  });
}

/**
 * Kopieert kop, tekst en beeldkoppelingen van een sectie als nieuwe sectie
 * achteraan in elk gekozen type.
 */
export async function kopieerSectie(sleutel: string, sectieId: string, doelen: string[]): Promise<Uitkomst> {
  await vereisBeheerder();
  return veilig(async () => {
    const supabase = adminClient();
    const bron = await sectieVanType(supabase, sleutel, sectieId);
    if (!bron) return fout("Deze sectie bestaat niet meer. Vernieuw de pagina.");
    const gekozen = [...new Set(doelen)].filter((d) => ontleedSleutel(d));
    if (gekozen.length === 0) return fout("Kies eerst een of meer types.");

    const { data: bestaand } = await supabase.from("adviestypes").select("sleutel").in("sleutel", gekozen);
    const typen = (bestaand ?? []).map((t) => t.sleutel as string);
    if (typen.length === 0) return fout("De gekozen types bestaan niet.");

    // Hoogste volgorde per doeltype (per type opvragen: blijft ruim onder de rijlimiet).
    const hoogste = await Promise.all(
      typen.map(async (t) => {
        const { data } = await supabase
          .from("adviessecties")
          .select("volgorde")
          .eq("type_sleutel", t)
          .order("volgorde", { ascending: false })
          .limit(1);
        return (data?.[0]?.volgorde as number | undefined) ?? -1;
      }),
    );

    const { data: nieuwe, error } = await supabase
      .from("adviessecties")
      .insert(
        typen.map((t, i) => ({ type_sleutel: t, volgorde: hoogste[i] + 1, kop: bron.kop, tekst: bron.tekst })),
      )
      .select("id");
    if (error || !nieuwe) throw new Error(error?.message ?? "kopiëren mislukt");

    const koppelingen = await koppelingenVan(supabase, bron.id);
    if (koppelingen.length) {
      const rijen = nieuwe.flatMap((s) =>
        koppelingen.map((k, i) => ({ sectie_id: s.id as string, volgorde: i, beeld_id: k.beeld_id })),
      );
      const { error: e2 } = await supabase.from("sectie_beelden").insert(rijen);
      if (e2) throw new Error(e2.message);
    }
    await raakAan(supabase, typen);
    ververs();
    const lijst = typen.length <= 8 ? ` (${typen.join(", ")})` : "";
    return ok(
      `De sectie is gekopieerd naar ${typen.length} ${typen.length === 1 ? "type" : "types"}${lijst}. Je vindt hem daar onderaan.`,
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
  await vereisBeheerder();
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
  await vereisBeheerder();
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
  await vereisBeheerder();
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
  await vereisBeheerder();
  let query = adminClient()
    .from("beelden")
    .select("id, code, naam, omschrijving, onderdeel, bijschrift, pad, thumb_pad")
    .order("code", { ascending: true })
    .limit(24);
  if ((ONDERDELEN as readonly string[]).includes(onderdeel)) query = query.eq("onderdeel", onderdeel);
  // Elk woord moet ergens voorkomen.
  for (const woord of veiligeZoekterm(zoek).split(" ").filter(Boolean)) {
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
