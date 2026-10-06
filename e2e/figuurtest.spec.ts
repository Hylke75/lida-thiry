import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

// De productpagina /figuurtest (vóór /bestellen) en de route ernaartoe. Zonder
// database (npm run e2e:lokaal) toont de site de standaardteksten; de nep-database
// geeft wel een prijs, dus dan staat er een prijs en een Product met aanbod.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

// Openbare pagina: nooit figuurtypes (die zijn alleen voor klanten achter de testlink).
const TYPENAMEN = /zandloper|peer\b|driehoek|rechthoek|\bde 8\b/i;

test.describe("figuurtest (productpagina)", () => {
  test("toont wat je krijgt, wat je nodig hebt, de prijs en de knop naar bestellen", async ({ page }) => {
    const res = await page.goto("/figuurtest");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("main")).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page).toHaveTitle(/figuurtest/i);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/figuurtest$/);

    const main = page.getByRole("main");
    // Alle knoppen "Start de figuurtest" op de pagina gaan naar het bestelformulier.
    const knoppen = main.getByRole("link", { name: /Start de figuurtest/ });
    expect(await knoppen.count()).toBeGreaterThan(0);
    for (const href of await knoppen.evaluateAll((a) => a.map((x) => x.getAttribute("href")))) expect(href).toBe("/bestellen");

    await expect(main.getByRole("heading", { name: "Wat heb je nodig?" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Een flexibel meetlint" })).toBeVisible();
    await expect(main.getByText("Ongeveer 15 tot 20 minuten", { exact: true })).toBeVisible();
    // Voorbeeld van de PDF: alleen algemene koppen.
    await expect(main.getByRole("figure")).toContainText("Jouw maten");
    await expect(main.getByRole("figure")).toContainText("Wat jou flatteert");
    // Veelgestelde vragen.
    await expect(main.getByRole("heading", { name: "Veelgestelde vragen" })).toBeVisible();

    // Nooit figuurtypes op deze openbare pagina.
    expect(await main.innerText()).not.toMatch(TYPENAMEN);
  });

  test("prijs en Product/Offer alleen als er een prijs is", async ({ page }) => {
    await page.goto("/figuurtest");
    const prijs = page.getByTestId("figuurtest-prijs");
    const jsonLd = page.locator('main script[type="application/ld+json"]');
    if ((await prijs.count()) === 0) {
      // Geen prijs ingesteld: de melding van de bestelpagina, geen Product.
      await expect(page.getByText(/De prijs is nog niet ingesteld/)).toBeVisible();
      await expect(jsonLd).toHaveCount(0);
      return;
    }
    await expect(prijs).toContainText("€");
    const data = JSON.parse((await jsonLd.first().textContent()) ?? "{}") as Record<string, unknown>;
    expect(data["@type"]).toBe("Product");
    expect(String(data.url)).toMatch(/\/figuurtest$/);
    expect(data.offers).toMatchObject({ "@type": "Offer", url: expect.stringMatching(/\/bestellen$/) });
  });

  test("bereikbaar via het menu en de knop rechtsboven", async ({ page }) => {
    await page.goto("/");
    const kop = page.getByRole("banner");
    await expect(kop.locator('a[href="/figuurtest"]').first()).toBeAttached();
    await expect(page.getByRole("contentinfo").locator('a[href="/figuurtest"]').first()).toBeVisible();
  });

  test("toegankelijkheid (axe, WCAG 2.1 AA) op telefoon en desktop", async ({ page }) => {
    for (const breedte of [390, 1440]) {
      await page.setViewportSize({ width: breedte, height: 900 });
      await page.goto("/figuurtest");
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const ernstig = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(ernstig.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `breedte ${breedte}`).toEqual([]);
      // Geen horizontaal scrollen.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  });
});

test.describe("afspraak zonder afspraaksoorten", () => {
  test("geen doodlopende weg: menu, homepage en /afspraak", async ({ page }) => {
    await page.goto("/");
    const boekbaar = (await page.getByRole("navigation", { name: "Hoofdmenu" }).first().locator('a[href="/afspraak"]').count()) > 0;
    test.skip(boekbaar, "Op deze omgeving zijn afspraaksoorten actief.");
    await expect(page.getByRole("contentinfo").locator('a[href="/afspraak"]')).toHaveCount(0);

    const res = await page.goto("/afspraak");
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    // Geen leeg boekingsformulier, wel een vriendelijke tekst met een link naar contact (als die pagina bestaat).
    await expect(page.locator("#afspraak")).toHaveCount(0);
    await expect(page.getByText(/Online een afspraak maken is op dit moment niet mogelijk/)).toBeVisible();
    const contact = await page.request.get("/contact");
    if (contact.status() === 200) {
      await expect(page.getByRole("main").getByRole("link", { name: "Stel je vraag" })).toHaveAttribute("href", "/contact");
    }
    await expect(page.getByRole("main").getByRole("link", { name: /figuurtest/ })).toHaveAttribute("href", "/figuurtest");
  });
});
