"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls } from "@/lib/beeldbank";
import { CATEGORIE_TABEL } from "@/rekenkern/config/categorie-tabel";
import {
  CATEGORIEEN,
  FFIT_TYPES,
  controleerLichaamstype,
  typeSleutel,
  type Lichaamstype,
} from "@/lib/lichaamstype-regels";

export interface Status {
  ok: boolean;
  melding: string;
  tijd: number;
}

const ok = (melding: string): Status => ({ ok: true, melding, tijd: Date.now() });
const fout = (melding: string): Status => ({ ok: false, melding, tijd: Date.now() });
const tekst = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

function ververs() {
  // Lichaamstypes komen terug in de test, de uitslag, de website en de PDF.
  revalidatePath("/", "layout");
}

function leesFormulier(fd: FormData): Partial<Lichaamstype> {
  const getal = (k: string) => Number(tekst(fd, k).replace(",", "."));
  return {
    code: tekst(fd, "code").toUpperCase(),
    naam: tekst(fd, "naam"),
    alias: tekst(fd, "alias") || null,
    korte_omschrijving: tekst(fd, "korte_omschrijving"),
    uitleg: tekst(fd, "uitleg").replace(/\r\n?/g, "\n"),
    kenmerken: tekst(fd, "kenmerken").replace(/\r\n?/g, "\n"),
    vorm: {
      schouder: getal("vorm_schouder"),
      borst: getal("vorm_borst"),
      taille: getal("vorm_taille"),
      hogeHeup: getal("vorm_hogeHeup"),
      heup: getal("vorm_heup"),
    },
    beeld_id: tekst(fd, "beeld_id") || null,
    volgorde: Number(tekst(fd, "volgorde")) || 0,
    actief: fd.get("actief") === "on",
  };
}

/** Opslaan van een bestaand lichaamstype. */
export async function slaLichaamstypeOp(_vorige: Status | null, fd: FormData): Promise<Status> {
  await vereisBeheerder("advies");
  const supabase = adminClient();
  const code = tekst(fd, "code");
  const t = leesFormulier(fd);
  const fouten = controleerLichaamstype(t, { nieuw: false, bestaandeCodes: [] });
  if (fouten.length) return fout(fouten.join(" "));

  const { error } = await supabase.from("lichaamstypes").update({ ...t, code: undefined }).eq("code", code);
  if (error) return fout(`Opslaan mislukte: ${error.message}`);
  // Titels van de adviestypes laten meelopen met de naam.
  await werkTitelsBij(code, t.naam!);
  ververs();

  if (!t.actief) {
    // Niet actief = niet kiesbaar in de test. De berekening kan het type nog
    // wel als uitkomst geven zolang er een koppeling naar verwijst.
    const { count } = await supabase
      .from("ffit_toewijzing")
      .select("ffit_type", { count: "exact", head: true })
      .eq("code", code);
    if (count) {
      return ok(
        "Opgeslagen. Let op: dit type is niet meer kiesbaar in de test, maar de berekening kan het nog als uitkomst geven. Pas zo nodig de koppeling op de overzichtspagina aan.",
      );
    }
  }
  return ok("Opgeslagen. De wijzigingen zijn direct zichtbaar in de test, de uitslag en nieuwe PDF's.");
}

function categorieTitel(categorie: number): string {
  return CATEGORIE_TABEL.find((c) => c.nummer === categorie)?.titel ?? `Categorie ${categorie}`;
}

async function werkTitelsBij(code: string, naam: string) {
  const supabase = adminClient();
  const { data } = await supabase.from("adviestypes").select("sleutel, categorie, titel").eq("letter", code);
  for (const r of data ?? []) {
    const automatisch = /^.+ – .+$/.test(r.titel) && r.titel.startsWith(categorieTitel(r.categorie) + " – ");
    if (automatisch) {
      await supabase
        .from("adviestypes")
        .update({ titel: `${categorieTitel(r.categorie)} – ${naam}` })
        .eq("sleutel", r.sleutel);
    }
  }
}

/**
 * Nieuw lichaamstype: maakt het type en de 12 bijbehorende adviestypes (één
 * per categorie). Optioneel wordt de inhoud (velden + beelden) van een bestaand
 * lichaamstype per categorie overgenomen als startpunt.
 */
export async function maakLichaamstype(_vorige: Status | null, fd: FormData): Promise<Status> {
  await vereisBeheerder("advies");
  const supabase = adminClient();
  const { data: bestaand } = await supabase.from("lichaamstypes").select("code, volgorde");
  const t = leesFormulier(fd);
  const fouten = controleerLichaamstype(t, {
    nieuw: true,
    bestaandeCodes: (bestaand ?? []).map((b) => b.code as string),
  });
  if (fouten.length) return fout(fouten.join(" "));
  if (!t.volgorde) t.volgorde = Math.max(0, ...(bestaand ?? []).map((b) => b.volgorde as number)) + 1;

  const { error } = await supabase.from("lichaamstypes").insert(t);
  if (error) return fout(`Aanmaken mislukte: ${error.message}`);

  // Labels (lengte/maat) per categorie overnemen van een bestaand adviestype.
  const { data: labels } = await supabase.from("adviestypes").select("categorie, lengte_label, maat_label");
  const labelVan = new Map((labels ?? []).map((l) => [l.categorie as number, l]));
  const { error: e2 } = await supabase.from("adviestypes").insert(
    CATEGORIEEN.map((c) => ({
      sleutel: typeSleutel(c, t.code!),
      letter: t.code,
      categorie: c,
      titel: `${categorieTitel(c)} – ${t.naam}`,
      lengte_label: labelVan.get(c)?.lengte_label ?? null,
      maat_label: labelVan.get(c)?.maat_label ?? null,
    })),
  );
  if (e2) {
    await supabase.from("lichaamstypes").delete().eq("code", t.code!);
    return fout(`De adviestypes konden niet worden aangemaakt: ${e2.message}`);
  }

  const bron = tekst(fd, "bron_code");
  let overgenomen = 0;
  if (bron) overgenomen = await neemInhoudOver(bron, t.code!);

  ververs();
  redirect(
    `/admin/lichaamstypes/${encodeURIComponent(t.code!)}?nieuw=${overgenomen ? `overgenomen-${overgenomen}` : "1"}`,
  );
}

/** Kopieert per categorie de velden en beeldkoppelingen van bron naar doel. */
async function neemInhoudOver(bron: string, doel: string): Promise<number> {
  const supabase = adminClient();
  let aantal = 0;
  for (const c of CATEGORIEEN) {
    const { data: secties } = await supabase
      .from("adviessecties")
      .select("id, veld_sleutel, volgorde, kop, tekst, afbeeldingen, sectie_beelden(volgorde, beeld_id)")
      .eq("type_sleutel", typeSleutel(c, bron));
    if (!secties?.length) continue;
    const { data: nieuw } = await supabase
      .from("adviessecties")
      .insert(
        secties.map((s) => ({
          type_sleutel: typeSleutel(c, doel),
          veld_sleutel: s.veld_sleutel,
          volgorde: s.volgorde,
          kop: s.kop,
          tekst: s.tekst,
          afbeeldingen: s.afbeeldingen,
        })),
      )
      .select("id, volgorde");
    const idPerVolgorde = new Map((nieuw ?? []).map((n) => [n.volgorde as number, n.id as string]));
    const koppelingen = secties.flatMap((s) =>
      (s.sectie_beelden as { volgorde: number; beeld_id: string }[]).map((k) => ({
        sectie_id: idPerVolgorde.get(s.volgorde as number)!,
        volgorde: k.volgorde,
        beeld_id: k.beeld_id,
      })),
    );
    if (koppelingen.length) await supabase.from("sectie_beelden").insert(koppelingen);
    aantal += nieuw?.length ?? 0;
  }
  return aantal;
}

/** Welke uitkomst van de berekening bij welk lichaamstype hoort. */
export async function slaToewijzingOp(_vorige: Status | null, fd: FormData): Promise<Status> {
  await vereisBeheerder("advies");
  const supabase = adminClient();
  const rijen = FFIT_TYPES.map((f) => ({ ffit_type: f, code: tekst(fd, `ffit_${f}`) }));
  if (rijen.some((r) => !r.code)) return fout("Kies voor elke uitkomst een lichaamstype.");
  const { error } = await supabase
    .from("ffit_toewijzing")
    .upsert(rijen.map((r) => ({ ...r, bijgewerkt_op: new Date().toISOString() })));
  if (error) return fout(`Opslaan mislukte: ${error.message}`);
  ververs();
  return ok("De koppeling is opgeslagen. Nieuwe tests gebruiken deze indeling direct.");
}

/**
 * Verwijdert een lichaamstype met zijn 12 adviestypes (inclusief velden en
 * beeldkoppelingen; de beelden blijven in de beeldbank). Kan alleen als er geen
 * bestellingen bij horen en de berekening het niet als uitkomst gebruikt.
 */
export async function verwijderLichaamstype(_vorige: Status | null, fd: FormData): Promise<Status> {
  await vereisBeheerder("advies");
  const supabase = adminClient();
  const code = tekst(fd, "code");
  if (tekst(fd, "bevestiging").toUpperCase() !== code) {
    return fout(`Typ ter bevestiging de code ${code} in het vak.`);
  }
  const { count: koppeling } = await supabase
    .from("ffit_toewijzing")
    .select("ffit_type", { count: "exact", head: true })
    .eq("code", code);
  if (koppeling) {
    return fout(
      "De berekening gebruikt dit type nog als uitkomst. Koppel die uitkomst(en) eerst aan een ander type op de overzichtspagina.",
    );
  }
  const sleutels = CATEGORIEEN.map((c) => typeSleutel(c, code));
  const { count: orders } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("toegekend_type", sleutels);
  if (orders) {
    return fout(
      `Er ${orders === 1 ? "hoort 1 bestelling" : `horen ${orders} bestellingen`} bij dit type. Verwijderen kan daarom niet; zet het type op ‘niet actief’ om het te archiveren.`,
    );
  }
  const { error: e1 } = await supabase.from("adviestypes").delete().eq("letter", code);
  if (e1) return fout(`Verwijderen mislukte: ${e1.message}`);
  const { error: e2 } = await supabase.from("lichaamstypes").delete().eq("code", code);
  if (e2) return fout(`Verwijderen mislukte: ${e2.message}`);
  ververs();
  redirect("/admin/lichaamstypes?verwijderd=" + encodeURIComponent(code));
}

export interface FotoKeuze {
  id: string;
  code: string;
  naam: string | null;
  omschrijving: string | null;
  url: string | null;
}

/** Zoekt beelden in de beeldbank voor de foto van een lichaamstype. */
export async function zoekFotos(zoek: string): Promise<FotoKeuze[]> {
  await vereisBeheerder("advies");
  const supabase = adminClient();
  let q = supabase
    .from("beelden")
    .select("id, code, naam, omschrijving, pad, thumb_pad")
    .order("code")
    .limit(24);
  const term = zoek.replace(/[%,()]/g, " ").trim();
  if (term) q = q.or(`code.ilike.%${term}%,naam.ilike.%${term}%,omschrijving.ilike.%${term}%,onderdeel.ilike.%${term}%`);
  else q = q.eq("onderdeel", "silhouetten");
  const { data } = await q;
  const rijen = data ?? [];
  const urls = await beeldUrls(rijen.map((r) => (r.thumb_pad ?? r.pad) as string));
  return rijen.map((r) => ({
    id: r.id,
    code: r.code,
    naam: r.naam,
    omschrijving: r.omschrijving,
    url: urls[(r.thumb_pad ?? r.pad) as string] ?? null,
  }));
}
