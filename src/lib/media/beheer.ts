import "server-only";
import { randomUUID } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { maakVersies } from "./verkleinen";
import { alleOptPaden, isOptPad } from "./verkleinen-regels";
import {
  bevatVerwijzing,
  controleerBestand,
  extensieVoorMime,
  gebruikPatroon,
  isImporteerbaar,
  isMediaBucket,
  isVeiligPad,
  mapVoorImport,
  MEDIA_BUCKET,
  MEDIA_PER_PAGINA,
  mediaPad,
  mimeVoorNaam,
  normaliseerMap,
  schoneBestandsnaam,
  STANDAARD_MAP,
  TYPE_FILTERS,
  WEBSITE_BEELD_INSTELLINGEN,
  zoekFilter,
  type Gebruik,
  type MediaItem,
  type MediaBucket,
  type TypeFilter,
} from "./regels";

export type { MediaItem };

export const MEDIA_VELDEN = "id, bucket, pad, url, naam, alt, mime, grootte, breedte, hoogte, map, aangemaakt_op";

export interface ZoekOpties {
  q?: string;
  map?: string | null;
  type?: TypeFilter;
  /** Alleen deze MIME-types (bijv. voor een kiezer die alleen iconen wil). */
  mimes?: readonly string[];
  pagina?: number;
  perPagina?: number;
}

export interface ZoekResultaat {
  items: MediaItem[];
  totaal: number;
  pagina: number;
  paginas: number;
}

/** Zoekt in de bibliotheek (naam/omschrijving), met filters op map en type; nieuwste eerst. */
export async function zoekMedia(o: ZoekOpties = {}): Promise<ZoekResultaat> {
  const per = Math.min(Math.max(Math.floor(o.perPagina ?? MEDIA_PER_PAGINA), 1), 100);
  const pagina = Math.max(1, Math.floor(Number(o.pagina) || 1));
  let q = adminClient()
    .from("media")
    .select(MEDIA_VELDEN, { count: "exact" })
    .order("aangemaakt_op", { ascending: false })
    .order("id", { ascending: true })
    .range((pagina - 1) * per, pagina * per - 1);
  const filter = zoekFilter(o.q);
  if (filter) q = q.or(filter);
  const map = o.map ? normaliseerMap(o.map) : null;
  if (map) q = q.eq("map", map);
  const typeMimes = o.type ? TYPE_FILTERS[o.type].mimes : null;
  if (typeMimes) q = q.in("mime", [...typeMimes]);
  if (o.mimes?.length) q = q.in("mime", [...o.mimes]);
  const { data, error, count } = await q;
  if (error) throw new Error(`Media lezen: ${error.message}`);
  const totaal = count ?? 0;
  return { items: (data ?? []) as MediaItem[], totaal, pagina, paginas: Math.max(1, Math.ceil(totaal / per)) };
}

export async function haalMedia(id: string): Promise<MediaItem | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await adminClient().from("media").select(MEDIA_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`Media lezen: ${error.message}`);
  return (data as MediaItem | null) ?? null;
}

/** Alle mappen die in gebruik zijn (voor filters en suggesties). */
export async function mediaMappen(): Promise<string[]> {
  const { data } = await adminClient().from("media").select("map").limit(5000);
  return [...new Set((data ?? []).map((r) => r.map as string))].sort((a, b) => a.localeCompare(b, "nl"));
}

function openbareUrl(bucket: string, pad: string): string {
  return adminClient().storage.from(bucket).getPublicUrl(pad).data.publicUrl;
}

// Uploaden ----------------------------------------------------------------------------

export type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fout: string };

export interface UploadPlek {
  bucket: MediaBucket;
  pad: string;
  token: string;
  signedUrl: string;
  url: string;
}

/** Stap 1: een eenmalige upload-URL in de bucket "media" (pad "<map>/<uuid>.<ext>"). */
export async function maakUpload(mime: string, grootte: number, map: string): Promise<Uitkomst<UploadPlek>> {
  const probleem = controleerBestand({ type: mime, size: grootte }, "alle");
  if (probleem) return { ok: false, fout: probleem };
  const ext = extensieVoorMime(mime)!;
  const pad = mediaPad(map, randomUUID(), ext);
  const opslag = adminClient().storage.from(MEDIA_BUCKET);
  const { data, error } = await opslag.createSignedUploadUrl(pad);
  if (error || !data) return { ok: false, fout: `Uploaden is niet gelukt (${error?.message ?? "onbekend"}).` };
  return { ok: true, bucket: MEDIA_BUCKET, pad, token: data.token, signedUrl: data.signedUrl, url: openbareUrl(MEDIA_BUCKET, pad) };
}

interface OpslagBestand {
  name: string;
  id: string | null;
  created_at?: string | null;
  metadata?: { size?: number; mimetype?: string } | null;
}

/** Zoekt één bestand in de opslag op (null als het er niet is). */
async function zoekBestand(bucket: string, pad: string): Promise<OpslagBestand | null> {
  const i = pad.lastIndexOf("/");
  const map = i >= 0 ? pad.slice(0, i) : "";
  const naam = pad.slice(i + 1);
  const { data, error } = await adminClient().storage.from(bucket).list(map, { search: naam, limit: 100 });
  if (error) return null;
  return ((data ?? []) as OpslagBestand[]).find((b) => b.name === naam && b.id) ?? null;
}

export interface Registratie {
  bucket: string;
  pad: string;
  naam?: string;
  alt?: string;
  map?: string;
  breedte?: number | null;
  hoogte?: number | null;
}

const afmeting = (n: unknown): number | null => {
  const v = Number(n);
  return Number.isInteger(v) && v > 0 && v < 100_000 ? v : null;
};

/**
 * Zet een geüpload bestand in de bibliotheek. Het bestand moet echt in de opslag
 * staan; grootte en type komen uit de opslag zelf. Bestond het al, dan blijft de
 * bestaande rij staan (en krijg je die terug).
 *
 * Daarnaast maken we een webversie (max. 2000 px, WebP, zonder EXIF/GPS; voor de
 * nieuwsbrief JPG/PNG tot 1200 px) en een miniatuur van 400 px onder "opt/…"
 * (zie verkleinen-regels.ts). Het origineel blijft staan; de afmetingen meten we
 * hier zelf (na EXIF-rotatie). `webUrl` is het adres van de webversie, of null
 * als er geen is (SVG, ICO, GIF, of het verkleinen lukte niet: dan gewoon het origineel).
 */
export async function registreerMedia(r: Registratie): Promise<Uitkomst<{ media: MediaItem; webUrl: string | null }>> {
  if (!isMediaBucket(r.bucket) || !isVeiligPad(r.pad) || isOptPad(r.pad)) return { ok: false, fout: "Onbekend bestand." };
  const bestand = await zoekBestand(r.bucket, r.pad);
  if (!bestand) return { ok: false, fout: "Het bestand is niet (meer) gevonden in de opslag." };
  const mime = bestand.metadata?.mimetype || mimeVoorNaam(r.pad);
  if (!mime || !extensieVoorMime(mime)) return { ok: false, fout: "Dit is geen ondersteunde afbeelding." };
  const naam = schoneBestandsnaam(r.naam || bestand.name);
  const versies = await maakVersies(r.bucket, r.pad, mime).catch((e) => {
    console.error("Verkleinen na upload mislukt; alleen het origineel wordt gebruikt.", e);
    return null;
  });
  const supabase = adminClient();
  const { error } = await supabase.from("media").upsert(
    {
      bucket: r.bucket,
      pad: r.pad,
      url: openbareUrl(r.bucket, r.pad),
      naam,
      alt: String(r.alt ?? "").replace(/\s+/g, " ").trim().slice(0, 300),
      mime,
      grootte: Math.max(0, Math.round(Number(bestand.metadata?.size) || 0)),
      breedte: versies?.origineel.breedte ?? afmeting(r.breedte),
      hoogte: versies?.origineel.hoogte ?? afmeting(r.hoogte),
      map: normaliseerMap(r.map) ?? STANDAARD_MAP,
    },
    { onConflict: "bucket,pad", ignoreDuplicates: true },
  );
  if (error) return { ok: false, fout: `Opslaan in de bibliotheek is niet gelukt (${error.message}).` };
  const { data } = await supabase.from("media").select(MEDIA_VELDEN).eq("bucket", r.bucket).eq("pad", r.pad).maybeSingle();
  if (!data) return { ok: false, fout: "Opslaan in de bibliotheek is niet gelukt." };
  vernieuwPubliekeData("media");
  return { ok: true, media: data as MediaItem, webUrl: versies?.webUrl ?? null };
}

/** Past naam, omschrijving en/of map aan. */
export async function werkMediaBij(id: string, w: { naam?: string; alt?: string; map?: string }): Promise<Uitkomst<{ media: MediaItem }>> {
  const wijziging: Record<string, string> = {};
  if (w.naam !== undefined) {
    const naam = schoneBestandsnaam(w.naam);
    wijziging.naam = naam;
  }
  if (w.alt !== undefined) wijziging.alt = String(w.alt).replace(/\s+/g, " ").trim().slice(0, 300);
  if (w.map !== undefined) {
    const map = normaliseerMap(w.map);
    if (!map) return { ok: false, fout: "Geef een map op (letters, cijfers en streepjes)." };
    wijziging.map = map;
  }
  const { data, error } = await adminClient().from("media").update(wijziging).eq("id", id).select(MEDIA_VELDEN).maybeSingle();
  if (error) return { ok: false, fout: `Opslaan is niet gelukt (${error.message}).` };
  if (!data) return { ok: false, fout: "Deze afbeelding bestaat niet meer." };
  vernieuwPubliekeData("media");
  return { ok: true, media: data as MediaItem };
}

// Gebruik -------------------------------------------------------------------------------

/** Waar wordt deze afbeelding gebruikt? Pagina's, blog, nieuwsbrieven en instellingen. */
export async function zoekGebruik(m: { bucket: string; pad: string }): Promise<Gebruik[]> {
  const supabase = adminClient();
  const patroon = gebruikPatroon(m);
  const [pInhoud, pOmslag, bInhoud, bOmslag, campagnes, instellingen] = await Promise.all([
    supabase.from("paginas").select("id, titel").ilike("inhoud", patroon).limit(100),
    supabase.from("paginas").select("id, titel").ilike("omslag_url", patroon).limit(100),
    supabase.from("blog_berichten").select("id, titel").ilike("inhoud", patroon).limit(100),
    supabase.from("blog_berichten").select("id, titel").ilike("omslag_url", patroon).limit(100),
    supabase.from("nb_campagnes").select("id, naam, soort, blokken").limit(2000),
    supabase.from("instellingen").select("sleutel, waarde").ilike("waarde", patroon).limit(100),
  ]);
  const fout = [pInhoud, pOmslag, bInhoud, bOmslag, campagnes, instellingen].find((r) => r.error)?.error;
  if (fout) throw new Error(`Gebruik zoeken: ${fout.message}`);

  const uit: Gebruik[] = [];
  const gezien = new Set<string>();
  const voeg = (g: Gebruik) => {
    if (gezien.has(g.href)) return;
    gezien.add(g.href);
    uit.push(g);
  };
  for (const p of [...(pOmslag.data ?? []), ...(pInhoud.data ?? [])]) voeg({ soort: "pagina", titel: p.titel as string, href: `/admin/paginas/${p.id}` });
  for (const b of [...(bOmslag.data ?? []), ...(bInhoud.data ?? [])]) voeg({ soort: "blog", titel: b.titel as string, href: `/admin/blog/${b.id}` });
  for (const c of campagnes.data ?? []) {
    if (!bevatVerwijzing(c.blokken, m)) continue;
    const pad = c.soort === "automatisch" ? "automatisch" : "campagnes";
    voeg({ soort: "nieuwsbrief", titel: c.naam as string, href: `/admin/nieuwsbrief/${pad}/${c.id}` });
  }
  for (const i of instellingen.data ?? []) {
    const sleutel = i.sleutel as string;
    const website = WEBSITE_BEELD_INSTELLINGEN[sleutel];
    voeg({ soort: "instelling", titel: website ?? sleutel, href: website ? `/admin/website#${sleutel}` : "/admin/instellingen" });
  }
  return uit;
}

/**
 * Verwijdert een afbeelding uit de opslag en de bibliotheek. Wordt hij nog gebruikt,
 * dan gebeurt er niets, tenzij `forceer` aan staat.
 */
export type VerwijderUitkomst = { ok: true } | { ok: false; fout: string; gebruik?: Gebruik[] };

export async function verwijderMedia(id: string, forceer: boolean): Promise<VerwijderUitkomst> {
  const m = await haalMedia(id);
  if (!m) return { ok: false, fout: "Deze afbeelding bestaat niet meer." };
  const gebruik = await zoekGebruik(m);
  if (gebruik.length && !forceer) {
    return { ok: false, fout: `Deze afbeelding wordt nog op ${gebruik.length} plek${gebruik.length === 1 ? "" : "ken"} gebruikt.`, gebruik };
  }
  const supabase = adminClient();
  // Het origineel plus de gemaakte versies (die er bij oudere bestanden niet zijn: geen probleem).
  const { error: opslagFout } = await supabase.storage.from(m.bucket).remove([m.pad, ...alleOptPaden(m.pad)]);
  if (opslagFout) return { ok: false, fout: `Verwijderen uit de opslag is niet gelukt (${opslagFout.message}).` };
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { ok: false, fout: `Verwijderen is niet gelukt (${error.message}).` };
  vernieuwPubliekeData("media");
  return { ok: true };
}

// Importeren ---------------------------------------------------------------------------

/** Alle bestanden in een bucket (recursief), met hun metadata. */
async function lijstBucket(bucket: string, map = "", diepte = 0, uit: { pad: string; b: OpslagBestand }[] = []) {
  if (diepte > 6 || uit.length > 20_000) return uit;
  const opslag = adminClient().storage.from(bucket);
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await opslag.list(map, { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`Opslag "${bucket}" lezen: ${error.message}`);
    const rijen = (data ?? []) as OpslagBestand[];
    for (const b of rijen) {
      const pad = map ? `${map}/${b.name}` : b.name;
      if (b.id) uit.push({ pad, b });
      else await lijstBucket(bucket, pad, diepte + 1, uit);
    }
    if (rijen.length < 1000) break;
  }
  return uit;
}

/** Zet afbeeldingen uit de buckets "blog" en "nieuwsbrief" die nog niet in de bibliotheek staan erbij. */
export async function importeerBestaande(): Promise<{ nieuw: number; bekeken: number }> {
  const supabase = adminClient();
  let nieuw = 0;
  let bekeken = 0;
  for (const bucket of ["blog", "nieuwsbrief"] as const) {
    // Gemaakte versies (opt/…) horen bij hun origineel en komen niet apart in de bibliotheek.
    const bestanden = (await lijstBucket(bucket)).filter((x) => isImporteerbaar(x.b.name) && isVeiligPad(x.pad) && !isOptPad(x.pad));
    bekeken += bestanden.length;
    if (!bestanden.length) continue;
    const { data: bestaand, error } = await supabase.from("media").select("pad").eq("bucket", bucket).limit(50_000);
    if (error) throw new Error(`Media lezen: ${error.message}`);
    const bekend = new Set((bestaand ?? []).map((r) => r.pad as string));
    const rijen = bestanden
      .filter((x) => !bekend.has(x.pad))
      .map(({ pad, b }) => {
        const mime = b.metadata?.mimetype && extensieVoorMime(b.metadata.mimetype) ? b.metadata.mimetype : mimeVoorNaam(b.name)!;
        return {
          bucket,
          pad,
          url: openbareUrl(bucket, pad),
          naam: schoneBestandsnaam(b.name),
          alt: "",
          mime,
          grootte: Math.max(0, Math.round(Number(b.metadata?.size) || 0)),
          map: mapVoorImport(bucket, pad),
          aangemaakt_op: b.created_at || new Date().toISOString(),
        };
      });
    for (let i = 0; i < rijen.length; i += 500) {
      const deel = rijen.slice(i, i + 500);
      const { error: e } = await supabase.from("media").upsert(deel, { onConflict: "bucket,pad", ignoreDuplicates: true });
      if (e) throw new Error(`Importeren: ${e.message}`);
      nieuw += deel.length;
    }
  }
  if (nieuw) vernieuwPubliekeData("media");
  return { nieuw, bekeken };
}
