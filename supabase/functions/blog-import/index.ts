// Eenmalige import van de blogberichten (met foto's) van de oude WordPress-site
// www.lidathiry.nl naar blog_berichten, de bucket 'blog', de mediabibliotheek en
// doorverwijzingen (/oude-slug → /blog/oude-slug).
//
// Draait als Supabase Edge Function, zodat de service-role-sleutel nooit buiten
// Supabase komt. Per aanroep één pagina van de WordPress-API:
//
//   curl -X POST "https://<ref>.supabase.co/functions/v1/blog-import?pagina=1&per=10" \
//     -H "Authorization: Bearer <anon-sleutel>" -H "x-import-sleutel: <sleutel>"
//
// Ga door met pagina=2, 3, … tot "klaar": true. Idempotent: bestaande berichten
// (zelfde slug) blijven ongemoeid tenzij &overschrijf=1, bestaande afbeeldingen
// en doorverwijzingen worden niet opnieuw geschreven.
//
// De sleutel staat niet in de repo, alleen de SHA-256 ervan. Opnieuw draaien:
// kies een nieuwe sleutel, zet de hash hieronder en deploy de functie opnieuw.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  bepaalLink,
  htmlNaarOpmaak,
  htmlNaarTekst,
  isOudeSite,
  kiesCategorieEnTags,
  normaliseerOudeUrl,
  opslagPad,
  samenvattingUitExcerpt,
  zonderDubbeleOmslag,
  type LinkContext,
  type LinkKeuze,
  type WpTerm,
} from "../../../src/lib/blog/wordpress.ts";

const SLEUTEL_SHA256 = "041bdcae8f61ff10bcab7f4912b2930e91b88f3bf1eb279771aa997e00413122";
const WP = "https://www.lidathiry.nl/wp-json/wp/v2";
const BUCKET = "blog";
const MAX_BYTES = 5 * 1024 * 1024; // limiet van de bucket
const MIMES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
/** Bestaande routes van de nieuwe site: daarvandaan nooit doorverwijzen. */
const ROUTES = new Set([
  "admin", "afspraak", "api", "auth", "bestellen", "blog", "cadeaubon", "mijn-advies", "nieuwsbrief",
  "privacy", "review", "status", "test", "voorwaarden", "robots.txt", "sitemap.xml", "manifest.webmanifest",
]);

interface WpBericht {
  id: number;
  date_gmt: string;
  slug: string;
  status: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  categories: number[];
  _embedded?: {
    "wp:featuredmedia"?: { source_url?: string; alt_text?: string; media_details?: { width?: number; height?: number } }[];
    "wp:term"?: WpTerm[][];
  };
}

async function sha256(tekst: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(tekst));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function wpJson<T>(pad: string): Promise<{ data: T; totaalPaginas: number }> {
  const res = await fetch(`${WP}${pad}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`WordPress ${pad}: ${res.status}`);
  return { data: (await res.json()) as T, totaalPaginas: Number(res.headers.get("x-wp-totalpages") ?? "1") };
}

async function alle<T>(pad: string): Promise<T[]> {
  const eerste = await wpJson<T[]>(`${pad}&per_page=100&page=1`);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, eerste.totaalPaginas - 1) }, (_, i) => wpJson<T[]>(`${pad}&per_page=100&page=${i + 2}`)),
  );
  return [eerste.data, ...rest.map((r) => r.data)].flat();
}

/** Voert taken uit met hooguit `n` tegelijk. */
async function beperkt<T, U>(items: T[], n: number, f: (x: T) => Promise<U>): Promise<U[]> {
  const uit: U[] = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        uit[k] = await f(items[k]);
      }
    }),
  );
  return uit;
}

interface Beeld {
  url: string;
  pad: string;
  bron: string;
}

/** Downloadt een afbeelding van de oude site en zet haar in de bucket en de mediabibliotheek. */
async function zetBeeld(db: SupabaseClient, bron: string, alt: string, maat: { breedte?: number; hoogte?: number }): Promise<Beeld | string> {
  const pad = opslagPad(bron);
  if (!pad) return `geen uploadadres: ${bron}`;
  const url = db.storage.from(BUCKET).getPublicUrl(pad).data.publicUrl;
  const { data: bestaand } = await db.from("media").select("url").eq("bucket", BUCKET).eq("pad", pad).maybeSingle();
  if (bestaand) return { url, pad, bron };

  const res = await fetch(bron);
  if (!res.ok) return `${res.status}: ${bron}`;
  const mime = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!MIMES.has(mime)) return `soort ${mime || "onbekend"}: ${bron}`;
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_BYTES) return `te groot (${bytes.byteLength} bytes): ${bron}`;

  const { error } = await db.storage.from(BUCKET).upload(pad, bytes, { contentType: mime, upsert: false, cacheControl: "31536000" });
  if (error && !/exists|duplicate/i.test(error.message)) return `upload ${pad}: ${error.message}`;
  await db.from("media").upsert(
    {
      bucket: BUCKET,
      pad,
      url,
      naam: pad.split("/").pop(),
      alt: alt.slice(0, 300),
      mime,
      grootte: bytes.byteLength,
      breedte: maat.breedte ?? null,
      hoogte: maat.hoogte ?? null,
      map: "blog",
    },
    { onConflict: "bucket,pad", ignoreDuplicates: true },
  );
  return { url, pad, bron };
}

/** Volgt een oud adres (WordPress stuurt hernoemde berichten door) en geeft /blog/slug als het een bericht blijkt. */
async function volgOudAdres(pad: string, slugs: Set<string>): Promise<string | null> {
  try {
    const res = await fetch(`https://www.lidathiry.nl${pad}/`, { method: "HEAD", redirect: "follow" });
    if (!res.ok) return null;
    const delen = new URL(res.url).pathname.split("/").filter(Boolean);
    return delen.length === 1 && slugs.has(delen[0]) ? `/blog/${delen[0]}` : null;
  } catch {
    return null;
  }
}

function antwoord(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return antwoord({ fout: "Gebruik POST." }, 405);
  if ((await sha256(req.headers.get("x-import-sleutel") ?? "")) !== SLEUTEL_SHA256) return antwoord({ fout: "Geen toegang." }, 403);

  const params = new URL(req.url).searchParams;
  const pagina = Math.max(1, Number(params.get("pagina") ?? "1") || 1);
  const per = Math.min(25, Math.max(1, Number(params.get("per") ?? "10") || 10));
  const overschrijf = params.get("overschrijf") === "1";

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });

  // Context voor links: alle berichten (id → slug) en categorieën.
  const [index, categorieen, paginasDb] = await Promise.all([
    alle<{ id: number; slug: string }>("/posts?_fields=id,slug&status=publish"),
    alle<WpTerm & { parent: number }>("/categories?_fields=id,name,slug,parent,taxonomy"),
    db.from("paginas").select("slug"),
  ]);
  const ctx: LinkContext = {
    slugVanId: new Map(index.map((p) => [p.id, p.slug])),
    slugs: new Set(index.map((p) => p.slug)),
    categorieen: new Map(categorieen.map((c) => [c.slug, htmlNaarTekst(c.name)])),
  };
  const ouderVan = new Map(categorieen.map((c) => [c.id, c.parent]));
  const bezet = new Set([...ROUTES, ...((paginasDb.data ?? []) as { slug: string }[]).map((p) => p.slug)]);

  const { data: berichten, totaalPaginas } = await wpJson<WpBericht[]>(
    `/posts?status=publish&orderby=date&order=asc&per_page=${per}&page=${pagina}&_embed=wp:featuredmedia,wp:term`,
  );

  const verslag = {
    pagina,
    totaalPaginas,
    klaar: pagina >= totaalPaginas,
    toegevoegd: [] as string[],
    overgeslagen: [] as string[],
    afbeeldingen: 0,
    problemen: [] as string[],
    onbekendeLinks: [] as string[],
  };

  const oudeAdressen = new Map<string, string | null>(); // relatief pad → /blog/slug of null

  for (const wp of berichten) {
    try {
      const slug = wp.slug;
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
        verslag.problemen.push(`ongeldige slug: ${slug}`);
        continue;
      }
      if (!overschrijf) {
        const { data } = await db.from("blog_berichten").select("id").eq("slug", slug).maybeSingle();
        if (data) {
          verslag.overgeslagen.push(slug);
          continue;
        }
      }

      const titel = htmlNaarTekst(wp.title.rendered).slice(0, 200) || slug;
      const html = wp.content.rendered;
      const omslagWp = wp._embedded?.["wp:featuredmedia"]?.[0];

      // Afbeeldingen: omslag + alle afbeeldingen in de tekst.
      const bronnen = new Map<string, { alt: string; maat: { breedte?: number; hoogte?: number } }>();
      const omslagBron = omslagWp?.source_url && isOudeSite(omslagWp.source_url) ? normaliseerOudeUrl(omslagWp.source_url) : null;
      if (omslagBron) {
        bronnen.set(omslagBron, {
          alt: htmlNaarTekst(omslagWp?.alt_text ?? "") || titel,
          maat: { breedte: omslagWp?.media_details?.width, hoogte: omslagWp?.media_details?.height },
        });
      }
      for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
        const src = /\ssrc="([^"]+)"/i.exec(m[1])?.[1];
        if (!src) continue;
        const ruw = htmlNaarTekst(src);
        if (!isOudeSite(ruw)) continue;
        const bron = normaliseerOudeUrl(ruw);
        if (!bronnen.has(bron)) {
          bronnen.set(bron, {
            alt: htmlNaarTekst(/\salt="([^"]*)"/i.exec(m[1])?.[1] ?? ""),
            maat: { breedte: Number(/\swidth="(\d+)"/i.exec(m[1])?.[1]) || undefined, hoogte: Number(/\sheight="(\d+)"/i.exec(m[1])?.[1]) || undefined },
          });
        }
      }
      const beelden = new Map<string, string>(); // oude bron → nieuw adres
      const herkomst = new Map<string, string>(); // nieuw adres → oude bron
      await beperkt([...bronnen], 6, async ([bron, info]) => {
        const r = await zetBeeld(db, bron, info.alt, info.maat);
        if (typeof r === "string") verslag.problemen.push(`${slug}: ${r}`);
        else {
          beelden.set(bron, r.url);
          herkomst.set(r.url, bron);
          verslag.afbeeldingen++;
        }
      });

      // Links: eerst bepalen (en oude adressen volgen), dan omzetten.
      const links = new Map<string, LinkKeuze>();
      for (const m of html.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)) {
        const href = htmlNaarTekst(m[1]);
        if (links.has(href)) continue;
        let keuze = bepaalLink(href, ctx);
        if (typeof keuze === "string" && keuze.startsWith("/") && !keuze.startsWith("/blog") && keuze !== "/") {
          const pad = keuze.split(/[?#]/)[0];
          if (!oudeAdressen.has(pad)) oudeAdressen.set(pad, await volgOudAdres(pad, ctx.slugs));
          const nieuw = oudeAdressen.get(pad);
          if (nieuw) keuze = nieuw;
          else verslag.onbekendeLinks.push(pad);
        }
        links.set(href, keuze);
      }

      const opmaak = htmlNaarOpmaak(html, {
        afbeelding: (src) => {
          const ruw = src.trim();
          if (!isOudeSite(ruw)) return null; // emoji en externe afbeeldingen vallen weg
          return beelden.get(normaliseerOudeUrl(ruw)) ?? null;
        },
        link: (href) => links.get(href.trim()) ?? links.get(href) ?? bepaalLink(href, ctx),
      });
      const omslagUrl = omslagBron ? beelden.get(omslagBron) ?? null : null;
      const inhoud = zonderDubbeleOmslag(opmaak, omslagUrl, (u) => herkomst.get(u)).slice(0, 100_000);

      const termen = wp._embedded?.["wp:term"]?.flat() ?? [];
      const { categorie, tags } = kiesCategorieEnTags(
        termen.filter((t) => t.taxonomy === "category"),
        termen.filter((t) => t.taxonomy === "post_tag"),
        (id) => ouderVan.get(id),
      );

      const rij = {
        slug,
        titel,
        samenvatting: samenvattingUitExcerpt(wp.excerpt.rendered),
        inhoud,
        omslag_url: omslagUrl,
        omslag_alt: omslagUrl ? (bronnen.get(omslagBron!)?.alt || titel).slice(0, 300) : "",
        categorie,
        tags,
        status: "gepubliceerd",
        gepubliceerd_op: `${wp.date_gmt}Z`,
        auteur: "Lida Thiry",
      };
      const { error } = await db.from("blog_berichten").upsert(rij, { onConflict: "slug" });
      if (error) throw new Error(error.message);
      verslag.toegevoegd.push(slug);

      if (!bezet.has(slug)) {
        await db
          .from("doorverwijzingen")
          .upsert({ van: `/${slug}`, naar: `/blog/${slug}`, permanent: true }, { onConflict: "van", ignoreDuplicates: true });
      }
    } catch (e) {
      verslag.problemen.push(`${wp.slug}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Bij de eerste pagina ook de categorie-, tag-, auteur- en feedadressen van WordPress.
  if (pagina === 1) {
    const vaste = [
      ...categorieen.map((c) => {
        const ouder = categorieen.find((o) => o.id === c.parent);
        return {
          van: `/categorie/${ouder ? `${ouder.slug}/` : ""}${c.slug}`,
          naar: `/blog?categorie=${encodeURIComponent(htmlNaarTekst(c.name))}`,
        };
      }),
      { van: "/categorie", naar: "/blog" },
      { van: "/author/admin", naar: "/blog" },
      { van: "/feed", naar: "/blog/rss.xml" },
    ];
    const { error } = await db
      .from("doorverwijzingen")
      .upsert(vaste.map((v) => ({ ...v, permanent: true })), { onConflict: "van", ignoreDuplicates: true });
    if (error) verslag.problemen.push(`vaste doorverwijzingen: ${error.message}`);
  }

  verslag.onbekendeLinks = [...new Set(verslag.onbekendeLinks)];
  return antwoord(verslag);
});
