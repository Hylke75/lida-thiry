import { describe, expect, it, vi } from "vitest";
import { CACHE_TAGS, LEVENSDUUR, levensduurVoor, NOODVOORZIENING_LEVENSDUUR, TABEL_TAGS, tagsVoorTabellen } from "../cache/tags";
import { DatabaseOvergeslagen, fetchMetTijdslimiet, maakStroomonderbreker } from "../cache/tijdslimiet";
import { filterPubliekeInstellingen, PUBLIEKE_INSTELLINGEN } from "../cache/publieke-instellingen";

describe("cache-tags", () => {
  it("koppelt tabellen aan tags (uniek, onbekende tabellen genegeerd)", () => {
    expect(tagsVoorTabellen(["instellingen"])).toEqual(["instellingen"]);
    expect(tagsVoorTabellen(["blog_berichten", "blog_berichten"])).toEqual(["blog"]);
    expect(tagsVoorTabellen(["beoordelingen", "paginas"]).sort()).toEqual(["paginas", "reviews"]);
    expect(tagsVoorTabellen(["orders", "nb_contacten"])).toEqual([]);
    expect(tagsVoorTabellen(["afspraak_soorten", "nb_formulieren", "inhoud", "media", "lichaamstypes"]).sort()).toEqual(
      ["afspraken", "formulieren", "inhoud", "lichaamstypes", "media"],
    );
  });

  it("gebruikt alleen bekende tags, elk met een levensduur", () => {
    for (const tags of Object.values(TABEL_TAGS)) for (const t of tags) expect(CACHE_TAGS).toContain(t);
    for (const t of CACHE_TAGS) expect(LEVENSDUUR[t]).toBeGreaterThan(0);
  });

  it("laat ingeplande blogberichten binnen 5 minuten verschijnen (datacache + pagina)", () => {
    // Een pagina neemt de kortste levensduur van zijn gegevens over; in het
    // slechtste geval telt die van de datacache er nog één keer bij op.
    expect(2 * LEVENSDUUR.blog).toBeLessThanOrEqual(300);
  });

  it("neemt de kortste levensduur van meerdere tags", () => {
    expect(levensduurVoor(["inhoud", "blog"])).toBe(LEVENSDUUR.blog);
    expect(levensduurVoor(["inhoud"])).toBe(LEVENSDUUR.inhoud);
    expect(levensduurVoor([])).toBe(3600);
    expect(NOODVOORZIENING_LEVENSDUUR).toBeLessThan(Math.min(...Object.values(LEVENSDUUR)));
  });
});

describe("publieke instellingen", () => {
  it("laat alleen de publieke sleutels door", () => {
    const uit = filterPubliekeInstellingen({
      prijs_cent: "2995",
      valuta: "EUR",
      site_naam: "Lida",
      logo_url: "https://x.supabase.co/storage/v1/object/public/media/logo/a.png",
      contact_email: "info@example.nl",
      adviseur_email: "prive@example.nl",
      nb_max_per_dag: "100",
      zandloper_variant: "excel",
      token_geldigheid_dagen: "30",
    });
    expect(uit).toEqual({
      prijs_cent: "2995",
      valuta: "EUR",
      site_naam: "Lida",
      logo_url: "https://x.supabase.co/storage/v1/object/public/media/logo/a.png",
      contact_email: "info@example.nl",
    });
  });

  it("bevat geen interne instellingen", () => {
    for (const intern of ["adviseur_email", "nb_max_per_dag", "zandloper_variant", "betaalherinnering_na_uren", "review_na_dagen"]) {
      expect(PUBLIEKE_INSTELLINGEN).not.toContain(intern);
    }
  });
});

/** Een nep-fetch die pas antwoordt na `ms`, en netjes stopt bij een afgebroken signaal. */
function trageFetch(ms: number, status = 200): typeof fetch {
  return (_invoer, init) =>
    new Promise<Response>((resolve, reject) => {
      const t = setTimeout(() => resolve(new Response("{}", { status })), ms);
      init?.signal?.addEventListener("abort", () => {
        clearTimeout(t);
        reject(init.signal!.reason);
      });
    });
}

describe("tijdslimiet en stroomonderbreker", () => {
  it("geeft een snel antwoord gewoon door", async () => {
    const f = fetchMetTijdslimiet(trageFetch(5), { ms: 200 });
    expect((await f("https://db")).status).toBe(200);
  });

  it("breekt een traag verzoek af na de tijdslimiet", async () => {
    const f = fetchMetTijdslimiet(trageFetch(5_000), { ms: 30 });
    const start = Date.now();
    await expect(f("https://db")).rejects.toMatchObject({ name: "TimeoutError" });
    expect(Date.now() - start).toBeLessThan(1_000);
  });

  it("slaat na een fout verzoeken een tijd over, en gaat daarna weer door", async () => {
    let nu = 1_000;
    const onderbreker = maakStroomonderbreker({ pauzeMs: 15_000, nu: () => nu });
    const basis = vi.fn(trageFetch(5_000));
    const f = fetchMetTijdslimiet(basis, { ms: 20, onderbreker });

    await expect(f("https://db")).rejects.toMatchObject({ name: "TimeoutError" });
    expect(onderbreker.isOpen()).toBe(true);

    // Binnen de pauze: direct een fout, zonder netwerkverzoek.
    await expect(f("https://db")).rejects.toBeInstanceOf(DatabaseOvergeslagen);
    expect(basis).toHaveBeenCalledTimes(1);

    // Na de pauze weer proberen; een goed antwoord sluit de onderbreker.
    nu += 15_001;
    basis.mockImplementation(trageFetch(1));
    expect((await f("https://db")).status).toBe(200);
    expect(onderbreker.isOpen()).toBe(false);
  });

  it("telt een serverfout (5xx) mee, maar geeft het antwoord terug", async () => {
    const onderbreker = maakStroomonderbreker();
    const f = fetchMetTijdslimiet(trageFetch(1, 503), { ms: 200, onderbreker });
    expect((await f("https://db")).status).toBe(503);
    expect(onderbreker.isOpen()).toBe(true);
  });

  it("telt een 4xx-antwoord niet als storing", async () => {
    const onderbreker = maakStroomonderbreker();
    const f = fetchMetTijdslimiet(trageFetch(1, 404), { ms: 200, onderbreker });
    expect((await f("https://db")).status).toBe(404);
    expect(onderbreker.isOpen()).toBe(false);
  });

  it("telt afbreken door de aanroeper zelf niet als databasefout", async () => {
    const onderbreker = maakStroomonderbreker();
    const f = fetchMetTijdslimiet(trageFetch(5_000), { ms: 2_000, onderbreker });
    const eigen = new AbortController();
    const belofte = f("https://db", { signal: eigen.signal });
    eigen.abort();
    await expect(belofte).rejects.toBeDefined();
    expect(onderbreker.isOpen()).toBe(false);
  });
});
