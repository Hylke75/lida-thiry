import { test, expect, type Page } from "@playwright/test";

// Controle in de browser van het contactformulier en de nieuwsbriefaanmelding.
// Er wordt niets echt verstuurd: lege of ongeldige invoer wordt al in de browser
// tegengehouden, en we controleren dat er dan ook geen verzoek naar de API gaat.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

/** Telt verzoeken naar een API-pad (en houdt ze tegen, voor de zekerheid). */
async function blokkeerApi(page: Page, pad: string) {
  const verzoeken: string[] = [];
  await page.route(`**${pad}`, (route) => {
    verzoeken.push(route.request().method());
    return route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ fout: "e2e: tegengehouden" }) });
  });
  return verzoeken;
}

test.describe("contactformulier", () => {
  test.beforeEach(async ({ page }) => {
    const res = await page.goto("/contact");
    test.skip(res?.status() === 404, "Geen gepubliceerde pagina 'contact' op deze omgeving.");
  });

  test("leeg versturen toont per veld een fout en verstuurt niets", async ({ page }) => {
    const verzoeken = await blokkeerApi(page, "/api/contact");
    const formulier = page.locator("#contactformulier form");
    await formulier.getByRole("button").click();

    const naam = formulier.getByLabel("Naam", { exact: false }).first();
    await expect(naam).toHaveAttribute("aria-invalid", "true");
    await expect(naam).toBeFocused();
    await expect(formulier.getByText("Vul je naam in.")).toBeVisible();
    await expect(formulier.getByText("Vul je e-mailadres in.")).toBeVisible();
    await expect(formulier.getByText("Schrijf je bericht.")).toBeVisible();
    // De fout is aan het veld gekoppeld (voor schermlezers).
    const beschreven = await naam.getAttribute("aria-describedby");
    expect(beschreven).toBeTruthy();
    await expect(page.locator(`[id="${beschreven!.split(" ")[0]}"]`)).toHaveText("Vul je naam in.");
    expect(verzoeken).toHaveLength(0);
  });

  test("ongeldig e-mailadres en te kort bericht", async ({ page }) => {
    const verzoeken = await blokkeerApi(page, "/api/contact");
    const formulier = page.locator("#contactformulier form");
    await formulier.getByLabel("Naam", { exact: false }).first().fill("E2E Test");
    await formulier.getByLabel("E-mailadres", { exact: false }).fill("geen-adres");
    await formulier.locator("textarea[name=bericht]").fill("Hoi");
    await formulier.getByRole("button").click();

    await expect(formulier.getByText("Dit lijkt geen geldig e-mailadres.")).toBeVisible();
    await expect(formulier.getByText("Je bericht is wel erg kort. Vertel iets meer.")).toBeVisible();
    await expect(formulier.getByText("Vul je naam in.")).toHaveCount(0);
    expect(verzoeken).toHaveLength(0);
  });

  test("de tekenteller loopt mee", async ({ page }) => {
    const bericht = page.locator("#contactformulier textarea[name=bericht]");
    await bericht.fill("Hallo Lida!");
    await expect(page.locator("#contactformulier").getByText(/^11 \/ [\d.]+ tekens$/)).toBeVisible();
  });
});

test.describe("nieuwsbriefaanmelding", () => {
  test("leeg versturen wordt door de browser tegengehouden", async ({ page }) => {
    const verzoeken = await blokkeerApi(page, "/api/nieuwsbrief/aanmelden");
    await page.goto("/blog");
    const formulier = page.locator("form").filter({ has: page.locator('input[name="email"]') }).last();
    await expect(formulier).toBeVisible();
    const email = formulier.locator('input[name="email"]');
    await expect(email).toHaveAttribute("required", "");

    await formulier.getByRole("button").click();
    const melding = await email.evaluate((el: HTMLInputElement) => (el.validity.valueMissing ? el.validationMessage : ""));
    expect(melding).not.toBe("");
    expect(verzoeken).toHaveLength(0);
  });

  test("ongeldig e-mailadres wordt tegengehouden", async ({ page }) => {
    const verzoeken = await blokkeerApi(page, "/api/nieuwsbrief/aanmelden");
    await page.goto("/blog");
    const formulier = page.locator("form").filter({ has: page.locator('input[name="email"]') }).last();
    const email = formulier.locator('input[name="email"]');
    await email.fill("geen-adres");
    await formulier.getByRole("button").click();
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.typeMismatch)).toBe(true);
    expect(verzoeken).toHaveLength(0);
  });

  test("een foutmelding van de server wordt netjes getoond", async ({ page }) => {
    // Geen echte aanmelding: het antwoord van de API wordt nagebootst.
    await page.route("**/api/nieuwsbrief/aanmelden", (route) =>
      route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ fout: "E2E: aanmelden mislukt." }) }),
    );
    await page.goto("/blog");
    const formulier = page.locator("form").filter({ has: page.locator('input[name="email"]') }).last();
    await formulier.locator('input[name="email"]').fill("e2e@example.com");
    await formulier.getByRole("button").click();
    await expect(formulier.getByRole("alert")).toHaveText("E2E: aanmelden mislukt.");
  });
});
