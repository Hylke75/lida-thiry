import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

// Toegankelijkheid (WCAG 2.1 AA) met axe-core op de belangrijkste publieke
// pagina's. De test faalt op overtredingen met impact "serious" of "critical";
// lichtere bevindingen ("moderate", "minor") komen alleen in de uitvoer.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

const PAGINAS: { pad: string; naam: string; status?: number }[] = [
  { pad: "/", naam: "homepage" },
  { pad: "/bestellen", naam: "bestellen" },
  { pad: "/blog", naam: "blogoverzicht" },
  { pad: "/contact", naam: "contact" },
  { pad: "/privacy", naam: "privacyverklaring" },
  { pad: "/voorwaarden", naam: "algemene voorwaarden" },
  { pad: "/cadeaubon", naam: "cadeaubon" },
  { pad: "/afspraak", naam: "afspraak" },
  { pad: "/mijn-advies", naam: "mijn advies" },
  { pad: "/admin/inloggen", naam: "inloggen beheer" },
  { pad: "/deze-pagina-bestaat-niet-a11y", naam: "404-pagina", status: 404 },
];

const ERNSTIG = new Set(["serious", "critical"]);

async function analyseer(page: Page) {
  return new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
}

/** Leesbare samenvatting: regel, impact, uitleg en de eerste paar elementen. */
function beschrijf(overtredingen: Awaited<ReturnType<typeof analyseer>>["violations"]) {
  return overtredingen
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `    ${n.target.join(" ")}\n      ${n.failureSummary?.split("\n").join("\n      ") ?? ""}`)
          .join("\n"),
    )
    .join("\n");
}

for (const { pad, naam, status = 200 } of PAGINAS) {
  test(`toegankelijkheid: ${naam} (${pad})`, async ({ page }, testInfo) => {
    const res = await page.goto(pad);
    if (pad === "/contact") test.skip(res?.status() === 404, "Geen gepubliceerde pagina 'contact' op deze omgeving.");
    expect(res?.status()).toBe(status);
    // Precies één h1 (soms alleen voor schermlezers, zoals op /afspraak).
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const { violations } = await analyseer(page);
    const ernstig = violations.filter((v) => ERNSTIG.has(v.impact ?? ""));
    const licht = violations.filter((v) => !ERNSTIG.has(v.impact ?? ""));
    if (licht.length) {
      await testInfo.attach("axe-lichte-bevindingen.txt", { body: beschrijf(licht), contentType: "text/plain" });
    }
    expect(ernstig.length, `Ernstige toegankelijkheidsproblemen op ${pad}:\n${beschrijf(ernstig)}`).toBe(0);
  });
}

test("toegankelijkheid: contactformulier met foutmeldingen", async ({ page }) => {
  const res = await page.goto("/contact");
  test.skip(res?.status() === 404, "Geen gepubliceerde pagina 'contact' op deze omgeving.");
  await page.route("**/api/contact", (route) => route.abort());
  await page.locator("#contactformulier form").getByRole("button").click();
  await expect(page.getByText("Vul je naam in.")).toBeVisible();
  const { violations } = await analyseer(page);
  const ernstig = violations.filter((v) => ERNSTIG.has(v.impact ?? ""));
  expect(ernstig.length, beschrijf(ernstig)).toBe(0);
});

test("toegankelijkheid: mobiel menu open", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/");
  await page.getByRole("banner").getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Hoofdmenu" })).toBeVisible();
  const { violations } = await analyseer(page);
  const ernstig = violations.filter((v) => ERNSTIG.has(v.impact ?? ""));
  expect(ernstig.length, beschrijf(ernstig)).toBe(0);
});
