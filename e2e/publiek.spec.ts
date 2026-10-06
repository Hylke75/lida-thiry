import { test, expect, type Page } from "@playwright/test";

// Rooktests voor de publieke site. Ze controleren alleen vaste koppen, landmarks
// en links, geen inhoud uit de database: zonder database (npm run e2e:lokaal)
// toont de site zijn standaardteksten en moeten deze tests ook slagen.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

/** Kop, hoofdinhoud, menu en voettekst: het vaste geraamte van elke publieke pagina. */
async function controleerGeraamte(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("lang", "nl");
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hoofdmenu" }).first()).toBeAttached();
  await expect(page.getByRole("contentinfo")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
}

test.describe("publieke pagina's", () => {
  test("homepage", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status()).toBe(200);
    await controleerGeraamte(page);
    await expect(page).toHaveTitle(/Lida Thiry/);
    // De knop rechtsboven (standaard naar de pagina over de figuurtest) staat altijd in de kop.
    await expect(page.getByRole("banner").getByRole("link", { name: /Start de figuurtest/ }).first()).toHaveAttribute(
      "href",
      "/figuurtest",
    );
    // De blokken uit het ontwerp, in volgorde: hero, adviesroutes, herkenning, stappen, Over Lida.
    const koppen = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
    const verwacht = ["Kies wat jij nu nodig hebt", "Een volle kledingkast", "Zo werkt het", "Niet vertellen wat"];
    const plekken = verwacht.map((k) => koppen.findIndex((t) => t.includes(k)));
    expect(plekken.every((p) => p >= 0), koppen.join(" | ")).toBe(true);
    expect([...plekken].sort((a, b) => a - b)).toEqual(plekken);
    // De hero-knop en de eerste adviesroute gaan naar de figuurtest; de routes verwijzen naar bestaande routes.
    await expect(page.locator("#top").getByRole("link", { name: /Start de figuurtest/ })).toHaveAttribute("href", "/figuurtest");
    const routes = page.locator("#advies article a");
    await expect(routes).toHaveCount(3);
    // Persoonlijk advies: naar /afspraak als er iets te boeken is (dan staat Afspraak ook in het menu), anders naar contact.
    const boekbaar = (await page.getByRole("navigation", { name: "Hoofdmenu" }).first().locator('a[href="/afspraak"]').count()) > 0;
    expect(await routes.evaluateAll((a) => a.map((x) => x.getAttribute("href")))).toEqual([
      "/figuurtest",
      boekbaar ? "/afspraak" : "/contact",
      "/cadeaubon",
    ]);
  });

  test("ga naar inhoud en het mobiele menu", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const overslaan = page.getByRole("link", { name: "Ga naar inhoud" });
    await expect(overslaan).toBeFocused();
    await expect(overslaan).toHaveAttribute("href", "#inhoud");

    const knop = page.getByRole("banner").getByRole("button", { name: "Menu" });
    await expect(knop).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#hoofdmenu")).toBeHidden();
    await knop.click();
    await expect(knop).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#hoofdmenu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(knop).toHaveAttribute("aria-expanded", "false");
    await expect(knop).toBeFocused();
    await expect(page.locator("#hoofdmenu")).toBeHidden();
  });

  test("startpagina van de test (bestellen)", async ({ page }) => {
    const res = await page.goto("/bestellen");
    expect(res?.status()).toBe(200);
    await controleerGeraamte(page);
    await expect(page.getByRole("link", { name: "← Terug" })).toHaveAttribute("href", "/figuurtest");
  });

  test("blogoverzicht", async ({ page }) => {
    const res = await page.goto("/blog");
    expect(res?.status()).toBe(200);
    await controleerGeraamte(page);
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveCount(1);
  });

  test("contactpagina", async ({ page }) => {
    const res = await page.goto("/contact");
    test.skip(res?.status() === 404, "Geen gepubliceerde pagina 'contact' op deze omgeving.");
    expect(res?.status()).toBe(200);
    await controleerGeraamte(page);
    await expect(page.locator("#contactformulier form")).toBeVisible();
  });

  for (const [pad, titel] of [
    ["/privacy", "Privacyverklaring"],
    ["/voorwaarden", "Algemene voorwaarden"],
  ] as const) {
    test(`juridische pagina ${pad}`, async ({ page }) => {
      const res = await page.goto(pad);
      expect(res?.status()).toBe(200);
      await controleerGeraamte(page);
      await expect(page.getByRole("heading", { level: 1, name: titel })).toBeVisible();
    });
  }

  test("onbekend pad geeft een Nederlandse 404", async ({ page }) => {
    const res = await page.goto("/deze-pagina-bestaat-echt-niet-e2e");
    expect(res?.status()).toBe(404);
    await expect(page).toHaveTitle(/Pagina niet gevonden/);
    await expect(page.locator("html")).toHaveAttribute("lang", "nl");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: /Doe de test/ })).toHaveAttribute("href", "/figuurtest");
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });

  test("voettekst linkt naar privacy en voorwaarden", async ({ page }) => {
    await page.goto("/");
    const voet = page.getByRole("contentinfo");
    await expect(voet.locator('a[href="/privacy"]').first()).toBeVisible();
    await expect(voet.locator('a[href="/voorwaarden"]').first()).toBeVisible();
    // De beheerlink staat standaard uit (Beheer → Website → Instellingen).
    await expect(voet.locator('a[href^="/admin"]')).toHaveCount(0);
  });

  test("ervaringen: zonder reviews een rustige plaatshouder, geen verzonnen citaten", async ({ page }) => {
    await page.goto("/");
    const blok = page.getByRole("region", { name: /Meer rust in je kast/ });
    await expect(blok).toBeVisible();
    await expect(blok.getByText("[Ervaringen van klanten volgen]")).toBeVisible();
    await expect(blok.locator("blockquote")).toHaveCount(0);
  });
});

test.describe("machineleesbare bestanden", () => {
  test("robots.txt", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const tekst = await res.text();
    expect(tekst).toMatch(/User-Agent: \*/i);
    expect(tekst).toContain("Disallow: /admin");
    expect(tekst).toMatch(/Sitemap: https?:\/\/\S+\/sitemap\.xml/);
  });

  test("sitemap.xml", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain("<urlset");
    for (const pad of ["/figuurtest", "/bestellen", "/blog", "/privacy", "/voorwaarden"]) {
      expect(xml).toMatch(new RegExp(`<loc>https?://[^<]+${pad}</loc>`));
    }
    expect(xml).not.toContain("/admin");
  });

  test("RSS-feed van de blog", async ({ request }) => {
    const res = await request.get("/blog/rss.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toMatch(/<channel>[\s\S]*<title>[^<]+<\/title>[\s\S]*<link>https?:\/\/[^<]+\/blog<\/link>/);
  });

  test("webmanifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { name?: string; lang?: string };
    expect(manifest.name).toBeTruthy();
  });
});
