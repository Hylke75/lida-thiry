import "server-only";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { PAGINA_VELDEN, valideerPagina, type Pagina } from "@/lib/paginas/beheer";
import { BERICHT_VELDEN, valideerBericht, zichtbaarheid, type BlogBericht } from "@/lib/blog/regels";
import { vindSectie } from "@/lib/inhoud/register";
import { combineer, valideer } from "@/lib/inhoud/schema";
import { registreerSlugWijziging } from "@/lib/doorverwijzingen/beheer";
import { haalPaginaBeheer, PAGINAS_PAD, vernieuwPaginas, vrijePaginaSlug } from "@/app/admin/paginas/_editor/server";
import { BLOG_PAD, haalBericht, vernieuwBlog, vrijeSlug } from "@/app/admin/blog/_editor/server";
import {
  beslisVersie,
  blogSnapshot,
  leesSnapshot,
  MAX_VERSIES,
  paginaSnapshot,
  snapshotTitel,
  tekstSnapshot,
  type TekstSnapshot,
  type VersieMeta,
  type VersieRij,
  type VersieSoort,
} from "./regels";

const META = "id, soort, ref, omschrijving, gemaakt_door, op";

/**
 * Bewaart een momentopname van de HUIDIGE inhoud, vóórdat die wordt
 * overschreven. Slaat over als de inhoud gelijk is aan de laatste versie, of
 * als dezelfde persoon net (< 5 min) al een versie maakte (`forceer` zet dat
 * laatste uit). Houdt maximaal 50 versies per onderdeel. Faalt zacht: opslaan
 * mag nooit mislukken omdat de geschiedenis niet bijgewerkt kon worden.
 */
export async function bewaarVersie(v: {
  soort: VersieSoort;
  ref: string;
  inhoud: unknown;
  omschrijving: string;
  door: string | null | undefined;
  forceer?: boolean;
}): Promise<void> {
  try {
    const db = adminClient();
    const door = v.door ?? null;
    const { data: laatste, error } = await db
      .from("versies")
      .select("inhoud, gemaakt_door, op")
      .eq("soort", v.soort)
      .eq("ref", v.ref)
      .order("op", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    const besluit = beslisVersie(laatste as Pick<VersieRij, "inhoud" | "gemaakt_door" | "op"> | null, { inhoud: v.inhoud, door }, new Date(), v.forceer);
    if (besluit !== "toevoegen") return;

    const { error: insertFout } = await db
      .from("versies")
      .insert({ soort: v.soort, ref: v.ref, inhoud: v.inhoud, omschrijving: v.omschrijving.slice(0, 200), gemaakt_door: door });
    if (insertFout) throw insertFout;

    // Oudere versies dan de nieuwste 50 opruimen.
    const { data: oud } = await db
      .from("versies")
      .select("id")
      .eq("soort", v.soort)
      .eq("ref", v.ref)
      .order("op", { ascending: false })
      .range(MAX_VERSIES, MAX_VERSIES + 499);
    if (oud?.length) await db.from("versies").delete().in("id", oud.map((r) => r.id as string));
  } catch (e) {
    console.error(`Versies: momentopname ${v.soort}/${v.ref} niet bewaard.`, e);
  }
}

/** De versies van één pagina/bericht/tekst, nieuwste eerst (zonder inhoud). */
export async function lijstVersies(soort: VersieSoort, ref: string): Promise<VersieMeta[]> {
  const { data, error } = await adminClient()
    .from("versies")
    .select(META)
    .eq("soort", soort)
    .eq("ref", ref)
    .order("op", { ascending: false })
    .limit(MAX_VERSIES);
  if (error) throw new Error(`Versies lezen: ${error.message}`);
  return (data ?? []) as VersieMeta[];
}

export async function haalVersie(id: string): Promise<VersieRij | null> {
  if (!UUID_PATROON.test(id)) return null;
  const { data, error } = await adminClient().from("versies").select(`${META}, inhoud`).eq("id", id).maybeSingle();
  if (error) throw new Error(`Versie lezen: ${error.message}`);
  return (data as VersieRij | null) ?? null;
}

/** De huidige inhoud van een onderdeel als momentopname, of null als het niet (meer) bestaat. */
export async function huidigeSnapshot(soort: VersieSoort, ref: string): Promise<unknown | null> {
  if (soort === "pagina") {
    const p = await haalPaginaBeheer(ref);
    return p ? paginaSnapshot(p) : null;
  }
  if (soort === "blog") {
    const b = await haalBericht(ref);
    return b ? blogSnapshot(b) : null;
  }
  if (!vindSectie(ref)) return null;
  const { data, error } = await adminClient().from("inhoud").select("waarde").eq("sleutel", ref).maybeSingle();
  if (error) throw new Error(`Tekst lezen: ${error.message}`);
  return tekstSnapshot(data?.waarde ?? null);
}

// Terugzetten -----------------------------------------------------------------------------

type Fout = { ok: false; fouten: string[] };
const fout = (...fouten: string[]): Fout => ({ ok: false, fouten });

export type Teruggezet =
  | { ok: true; soort: "pagina"; pagina: Pagina }
  | { ok: true; soort: "blog"; bericht: BlogBericht }
  | { ok: true; soort: "tekst"; waarden: Record<string, unknown>; aangepast: boolean }
  | Fout;

/**
 * Zet een versie terug: bewaart eerst de huidige toestand ("Voor terugzetten"),
 * zet dan de inhoud terug en ververst dezelfde pagina's als gewoon opslaan.
 * De publicatiestatus blijft zoals hij nu is; alleen de inhoud verandert.
 */
export async function zetTerug(id: string, door: string | null | undefined): Promise<Teruggezet> {
  const versie = await haalVersie(id);
  if (!versie) return fout("Deze versie bestaat niet (meer).");
  const snap = leesSnapshot(versie.inhoud);

  if (versie.soort === "pagina") {
    const huidig = await haalPaginaBeheer(versie.ref);
    if (!huidig) return fout("Deze pagina bestaat niet meer. Herstel hem via de prullenbak.");
    const v = valideerPagina(snap);
    if (!v.ok) return fout("Deze versie kan niet worden teruggezet:", ...v.fouten);
    const slug = await vrijePaginaSlug(v.waarde.slug, huidig.id);
    await bewaarVersie({ soort: "pagina", ref: huidig.id, inhoud: paginaSnapshot(huidig), omschrijving: "Voor terugzetten", door, forceer: true });
    const { data, error } = await adminClient().from("paginas").update({ ...v.waarde, slug }).eq("id", huidig.id).select(PAGINA_VELDEN).single();
    if (error || !data) return fout(`Terugzetten is niet gelukt (${error?.message ?? "onbekend"}).`);
    if (huidig.status === "gepubliceerd" && huidig.slug !== slug) await registreerSlugWijziging(`/${huidig.slug}`, `/${slug}`);
    vernieuwPaginas(huidig.slug, slug);
    revalidatePath(`${PAGINAS_PAD}/${huidig.id}`);
    return { ok: true, soort: "pagina", pagina: data as Pagina };
  }

  if (versie.soort === "blog") {
    const huidig = await haalBericht(versie.ref);
    if (!huidig) return fout("Dit bericht bestaat niet meer. Herstel het via de prullenbak.");
    const v = valideerBericht(snap);
    if (!v.ok) return fout("Deze versie kan niet worden teruggezet:", ...v.fouten);
    const slug = await vrijeSlug(v.waarde.slug, huidig.id);
    await bewaarVersie({ soort: "blog", ref: huidig.id, inhoud: blogSnapshot(huidig), omschrijving: "Voor terugzetten", door, forceer: true });
    const { data, error } = await adminClient()
      .from("blog_berichten")
      .update({ ...v.waarde, slug })
      .eq("id", huidig.id)
      .select(BERICHT_VELDEN)
      .single();
    if (error || !data) return fout(`Terugzetten is niet gelukt (${error?.message ?? "onbekend"}).`);
    if (zichtbaarheid(huidig) === "online" && huidig.slug !== slug) await registreerSlugWijziging(`/blog/${huidig.slug}`, `/blog/${slug}`);
    vernieuwBlog(huidig.slug, slug);
    revalidatePath(`${BLOG_PAD}/${huidig.id}`);
    return { ok: true, soort: "blog", bericht: data as BlogBericht };
  }

  // Tekst
  const gevonden = vindSectie(versie.ref);
  if (!gevonden) return fout("Dit tekstonderdeel bestaat niet meer.");
  const db = adminClient();
  const { data: rij, error: leesFout } = await db.from("inhoud").select("waarde").eq("sleutel", versie.ref).maybeSingle();
  if (leesFout) return fout(`Terugzetten is niet gelukt (${leesFout.message}).`);
  const doel = (snap as Partial<TekstSnapshot>).waarde ?? null;
  let schoon: Record<string, unknown> | null = null;
  if (doel) {
    const v = valideer(gevonden.sectie, doel);
    if (!v.ok) return fout("Deze versie kan niet worden teruggezet:", ...v.fouten);
    schoon = v.waarde;
  }
  await bewaarVersie({ soort: "tekst", ref: versie.ref, inhoud: tekstSnapshot(rij?.waarde ?? null), omschrijving: "Voor terugzetten", door, forceer: true });
  const { error } = schoon
    ? await db.from("inhoud").upsert({ sleutel: versie.ref, waarde: schoon }, { onConflict: "sleutel" })
    : await db.from("inhoud").delete().eq("sleutel", versie.ref);
  if (error) return fout(`Terugzetten is niet gelukt (${error.message}).`);
  vernieuwPubliekeData("inhoud");
  revalidatePath("/", "layout");
  return { ok: true, soort: "tekst", waarden: combineer(gevonden.sectie, schoon), aangepast: Boolean(schoon) };
}

// Prullenbak ------------------------------------------------------------------------------

export interface PrullenbakItem {
  versieId: string;
  soort: "pagina" | "blog";
  ref: string;
  titel: string;
  slug: string;
  op: string;
  door: string | null;
  aantalVersies: number;
}

const TABEL = { pagina: "paginas", blog: "blog_berichten" } as const;

async function bestaandeIds(soort: "pagina" | "blog", ids: string[]): Promise<Set<string>> {
  const uit = new Set<string>();
  const geldig = ids.filter((i) => UUID_PATROON.test(i));
  for (let i = 0; i < geldig.length; i += 100) {
    const { data, error } = await adminClient().from(TABEL[soort]).select("id").in("id", geldig.slice(i, i + 100));
    if (error) throw new Error(`Prullenbak: ${error.message}`);
    for (const r of data ?? []) uit.add(r.id as string);
  }
  return uit;
}

/** Verwijderde pagina's en berichten: versies waarvan het onderdeel niet meer bestaat. */
export async function lijstPrullenbak(): Promise<PrullenbakItem[]> {
  const { data, error } = await adminClient()
    .from("versies")
    .select("id, soort, ref, op, gemaakt_door, titel:inhoud->>titel, slug:inhoud->>slug")
    .in("soort", ["pagina", "blog"])
    .order("op", { ascending: false })
    .limit(5000);
  if (error) throw new Error(`Prullenbak lezen: ${error.message}`);
  type Rij = { id: string; soort: "pagina" | "blog"; ref: string; op: string; gemaakt_door: string | null; titel: string | null; slug: string | null };
  const laatste = new Map<string, PrullenbakItem>();
  for (const r of (data ?? []) as Rij[]) {
    const sleutel = `${r.soort}:${r.ref}`;
    const bestaand = laatste.get(sleutel);
    if (bestaand) {
      bestaand.aantalVersies++;
      continue;
    }
    laatste.set(sleutel, {
      versieId: r.id,
      soort: r.soort,
      ref: r.ref,
      titel: snapshotTitel({ titel: r.titel }),
      slug: r.slug ?? "",
      op: r.op,
      door: r.gemaakt_door,
      aantalVersies: 1,
    });
  }
  const items = [...laatste.values()];
  const [paginas, berichten] = await Promise.all([
    bestaandeIds("pagina", items.filter((i) => i.soort === "pagina").map((i) => i.ref)),
    bestaandeIds("blog", items.filter((i) => i.soort === "blog").map((i) => i.ref)),
  ]);
  return items.filter((i) => !(i.soort === "pagina" ? paginas : berichten).has(i.ref));
}

/**
 * Zet een verwijderde pagina of een verwijderd bericht terug als concept, met
 * het oorspronkelijke id (zodat de geschiedenis er weer bij hoort). Is het
 * webadres inmiddels bezet, dan krijgt het een achtervoegsel (-2, -3, …).
 */
export async function herstelVerwijderd(versieId: string): Promise<{ ok: true; soort: "pagina" | "blog"; id: string } | Fout> {
  const versie = await haalVersie(versieId);
  if (!versie || (versie.soort !== "pagina" && versie.soort !== "blog")) return fout("Deze versie bestaat niet (meer).");
  if (!UUID_PATROON.test(versie.ref)) return fout("Deze versie hoort niet bij een pagina of bericht.");
  const snap = leesSnapshot(versie.inhoud);
  const db = adminClient();

  if (versie.soort === "pagina") {
    if (await haalPaginaBeheer(versie.ref)) return fout("Deze pagina bestaat al; er is niets te herstellen.");
    const v = valideerPagina(snap);
    if (!v.ok) return fout("Deze pagina kan niet worden hersteld:", ...v.fouten);
    const slug = await vrijePaginaSlug(v.waarde.slug);
    const { error } = await db.from("paginas").insert({ ...v.waarde, slug, id: versie.ref, status: "concept" });
    if (error) return fout(`Herstellen is niet gelukt (${error.message}).`);
    vernieuwPaginas(slug);
    return { ok: true, soort: "pagina", id: versie.ref };
  }

  if (await haalBericht(versie.ref)) return fout("Dit bericht bestaat al; er is niets te herstellen.");
  const v = valideerBericht(snap);
  if (!v.ok) return fout("Dit bericht kan niet worden hersteld:", ...v.fouten);
  const slug = await vrijeSlug(v.waarde.slug);
  const { error } = await db.from("blog_berichten").insert({
    ...v.waarde,
    slug,
    id: versie.ref,
    status: "concept",
    gepubliceerd_op: null,
    ai_gegenereerd: snap.ai_gegenereerd === true,
    ai_opdracht: snap.ai_opdracht && typeof snap.ai_opdracht === "object" ? snap.ai_opdracht : null,
  });
  if (error) return fout(`Herstellen is niet gelukt (${error.message}).`);
  vernieuwBlog(slug);
  return { ok: true, soort: "blog", id: versie.ref };
}

/** Wist de geschiedenis van een verwijderd onderdeel definitief (alleen als het echt weg is). */
export async function wisGeschiedenis(soort: "pagina" | "blog", ref: string): Promise<{ ok: true } | Fout> {
  if (!UUID_PATROON.test(ref)) return fout("Onbekend onderdeel.");
  const bestaat = soort === "pagina" ? await haalPaginaBeheer(ref) : await haalBericht(ref);
  if (bestaat) return fout("Dit onderdeel bestaat nog; de geschiedenis wordt niet gewist.");
  const { error } = await adminClient().from("versies").delete().eq("soort", soort).eq("ref", ref);
  if (error) return fout(`Wissen is niet gelukt (${error.message}).`);
  return { ok: true };
}
