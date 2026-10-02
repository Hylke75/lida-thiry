import { test, expect, type Page } from "@playwright/test";

// Volledige klantflow: gratis bestelling -> test invullen -> resultaat -> PDF.
// Vereist E2E_BASE_URL en GRATIS_TEST op de doelomgeving. Niet tegen productie draaien.
const BASE_URL = process.env.E2E_BASE_URL;

test.skip(!BASE_URL, "E2E_BASE_URL is niet gezet; e2e-tests overgeslagen (zie playwright.config.ts).");

async function volgende(page: Page, stap: string) {
  await page.getByRole("button", { name: `Volgende: ${stap} →` }).click();
  await expect(page.getByRole("heading", { level: 1, name: stap, exact: true })).toBeVisible();
}

async function vulMaat(page: Page, titel: string, waarde: string) {
  const kaart = page.locator("section").filter({ has: page.getByRole("heading", { name: titel, exact: true }) });
  await kaart.getByLabel("1e meting", { exact: true }).fill(waarde);
  await kaart.getByLabel("2e meting (controle)", { exact: true }).fill(waarde);
}

test("gratis bestelling, test invullen en advies-PDF downloaden", async ({ page, request }) => {
  const bestelling = await request.post("/api/bestellen", {
    data: {
      gratis: true,
      klantnaam: "E2E Test",
      email: `e2e+${Date.now()}@example.com`,
      voorwaarden_akkoord: true,
      directe_levering_akkoord: true,
    },
  });
  const data = (await bestelling.json().catch(() => ({}))) as { testUrl?: string };
  test.skip(
    !data.testUrl,
    `Geen testUrl ontvangen (status ${bestelling.status()}); staat GRATIS_TEST aan op de doelomgeving?`,
  );
  // testUrl is absoluut (op basis van de site-URL); gebruik alleen het pad.
  const testPad = new URL(data.testUrl!).pathname;
  const token = testPad.split("/").pop()!;

  await page.goto(testPad);

  // 1. Over jou
  await expect(page.getByRole("heading", { level: 1, name: "Over jou" })).toBeVisible();
  await page.getByLabel("Lengte", { exact: true }).fill("170");
  await page.getByLabel("Gewicht", { exact: true }).fill("65");
  await volgende(page, "Bovenlichaam");

  // 2. Bovenlichaam (schouder is optioneel)
  await vulMaat(page, "Borstomvang", "92");
  await volgende(page, "Taille");

  // 3. Taille
  await vulMaat(page, "Tailleomvang", "85");
  await vulMaat(page, "Hoge heupomvang", "90");
  await volgende(page, "Heupen en benen");

  // 4. Heupen en benen (binnenbeen is optioneel)
  await vulMaat(page, "Heupomvang", "95");
  await volgende(page, "Silhouet");

  // 5. Silhouet: deze maten geven een Rechthoek (type 6H), dus geen silhouetverschil.
  await page.locator("label").filter({ hasText: "Rechthoek" }).click();
  await volgende(page, "Vragen");

  // 6. Vragen: kies bij elke vraag de eerste optie.
  const vragen = page.locator("fieldset");
  const aantal = await vragen.count();
  expect(aantal).toBeGreaterThan(0);
  for (let i = 0; i < aantal; i++) {
    await vragen.nth(i).locator("label").first().click();
  }
  await volgende(page, "Afronden");

  // 7. Afronden
  await page.getByRole("button", { name: "Test afronden" }).click();
  await expect(page.getByText(/jouw type/i)).toBeVisible({ timeout: 60_000 });
  const pdfLink = page.getByRole("link", { name: "Download je advies (PDF)" });
  await expect(pdfLink).toBeVisible();
  await expect(pdfLink).toHaveAttribute("href", `/api/test/${token}/pdf`);

  // De PDF-route redirect naar een tijdelijke signed URL; volg die.
  const pdf = await request.get(`/api/test/${token}/pdf`, { maxRedirects: 5 });
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
});
