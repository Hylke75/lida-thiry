import { test, expect, type Page } from "@playwright/test";

// Bestelflow. Twee lagen:
//  1. Het formulier in de browser (altijd, als er een prijs is ingesteld): verplichte
//     velden en vinkjes, en wat er naar /api/bestellen gaat. Het antwoord van de API
//     wordt nagebootst, dus er komt geen bestelling of betaling.
//  2. De echte betaling tot aan de Mollie-checkout: alleen met E2E_BESTELFLOW=1, op
//     een omgeving met een Mollie-TESTsleutel en een testdatabase (bijv. een preview).
//     Maakt een echte (test)bestelling aan. Nooit tegen productie draaien.
// De gratis flow (zonder betalen) staat in test-flow.spec.ts.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

/** Naar /bestellen; overslaan als er geen prijs is (dan is er geen formulier). */
async function naarBestelformulier(page: Page) {
  await page.goto("/bestellen");
  const knop = page.getByRole("button", { name: "Naar betaling" });
  const heeftFormulier = await knop.isVisible();
  test.skip(!heeftFormulier, "Geen bestelformulier: er is op deze omgeving geen prijs ingesteld.");
  return knop;
}

async function vulIn(page: Page) {
  await page.getByLabel("Naam", { exact: false }).first().fill("E2E Test");
  await page.getByLabel("E-mailadres", { exact: false }).fill(`e2e+${Date.now()}@example.com`);
  await page.getByLabel("Adres", { exact: true }).fill("Teststraat 1");
  await page.getByLabel("Postcode").fill("1234 AB");
  await page.getByLabel("Plaats").fill("Hilversum");
  await page.locator('input[name="voorwaarden_akkoord"]').check();
  await page.locator('input[name="directe_levering_akkoord"]').check();
}

test.describe("bestelformulier", () => {
  test("verplichte velden en vinkjes worden gecontroleerd", async ({ page }) => {
    let verzoeken = 0;
    await page.route("**/api/bestellen", (route) => {
      verzoeken++;
      return route.fulfill({ status: 503, contentType: "application/json", body: "{}" });
    });
    const knop = await naarBestelformulier(page);
    await knop.click();
    const naam = page.locator('input[name="klantnaam"]');
    expect(await naam.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);

    // Alles ingevuld behalve het vinkje voor de voorwaarden: nog steeds tegengehouden.
    await vulIn(page);
    await page.locator('input[name="voorwaarden_akkoord"]').uncheck();
    await knop.click();
    expect(
      await page.locator('input[name="voorwaarden_akkoord"]').evaluate((el: HTMLInputElement) => el.validity.valueMissing),
    ).toBe(true);
    expect(verzoeken).toBe(0);
  });

  test("stuurt de juiste gegevens en volgt de checkout-link (nagebootst)", async ({ page }) => {
    let ontvangen: Record<string, unknown> | null = null;
    await page.route("**/api/bestellen", async (route) => {
      ontvangen = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ checkoutUrl: "/bestellen/bedankt?e2e=1" }),
      });
    });
    const knop = await naarBestelformulier(page);
    await vulIn(page);
    await knop.click();
    await page.waitForURL(/\/bestellen\/bedankt/);
    expect(ontvangen).toMatchObject({
      klantnaam: "E2E Test",
      voorwaarden_akkoord: true,
      directe_levering_akkoord: true,
      gratis: false,
      website: "",
      factuurgegevens: { adres: "Teststraat 1", postcode: "1234 AB", plaats: "Hilversum", land: "Nederland" },
    });
  });

  test("een fout van de server wordt getoond en het formulier blijft staan", async ({ page }) => {
    await page.route("**/api/bestellen", (route) =>
      route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ fout: "E2E: kortingscode onbekend." }) }),
    );
    const knop = await naarBestelformulier(page);
    await vulIn(page);
    await knop.click();
    await expect(page.getByText("E2E: kortingscode onbekend.")).toBeVisible();
    await expect(knop).toBeEnabled();
    await expect(page).toHaveURL(/\/bestellen$/);
  });
});

test.describe("echte betaling (Mollie-testmodus)", () => {
  test.skip(
    process.env.E2E_BESTELFLOW !== "1",
    "Zet E2E_BESTELFLOW=1 (alleen tegen een omgeving met Mollie-testsleutel en testdatabase).",
  );

  test("bestellen leidt naar de Mollie-checkout", async ({ page }) => {
    const knop = await naarBestelformulier(page);
    await vulIn(page);
    await knop.click();
    await page.waitForURL(/mollie\.com/, { timeout: 60_000 });
    expect(new URL(page.url()).hostname).toMatch(/(^|\.)mollie\.com$/);
  });
});
