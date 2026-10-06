import { test, expect, type Page } from "@playwright/test";

// Het figuursysteem zit achter de betaalmuur: geen openbare figuurtypepagina's,
// geen typenamen op de homepage, en "Jouw figuurtype" alleen met een geldige
// testlink van een betaalde bestelling met afgeronde test.
//
// De testlinks hieronder bestaan alleen in de nep-database van
// scripts/e2e-lokaal.mjs (ook zonder --voorbeelddata); op een echte omgeving
// worden die specs overgeslagen.
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

const TEST_TOKEN = "e2e-voorbeeld-test"; // betaald, test nog niet gedaan
const UITSLAG_TOKEN = "e2e-voorbeeld-uitslag"; // advies verzonden, type 6H (Rechthoek)
const TYPENAMEN = ["Zandloper", "Peer / driehoek", "Omgekeerde driehoek", "Rechthoek", "De 8"];
const lokaal = !!process.env.E2E_LOKAAL;

test("er zijn geen openbare figuurtypepagina's", async ({ request }) => {
  expect((await request.get("/figuurtypes")).status()).toBe(404);
  expect((await request.get("/figuurtypes/x")).status()).toBe(404);
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("figuurtype");
});

test("de homepage toont geen figuurtypes", async ({ page }) => {
  await page.goto("/");
  const tekst = await page.locator("body").innerText();
  for (const naam of TYPENAMEN) expect(tekst, naam).not.toContain(naam);
  await expect(page.locator('a[href*="figuurtype"]')).toHaveCount(0);
});

test.describe("achter de testlink", () => {
  test.skip(!lokaal, "Vaste testlinks bestaan alleen in de lokale nep-database.");

  test("de uitslag linkt naar Jouw figuurtype", async ({ page }) => {
    await page.goto(`/test/${UITSLAG_TOKEN}`);
    await expect(page.getByRole("heading", { level: 2, name: "Rechthoek" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Silhouet: Rechthoek" })).toBeVisible();
    const link = page.getByRole("link", { name: /Lees alles over jouw figuurtype/ });
    await expect(link).toHaveAttribute("href", `/test/${UITSLAG_TOKEN}/figuurtype`);
    await link.click();
    await expect(page.getByRole("heading", { level: 1, name: "Rechthoek" })).toBeVisible();
  });

  test("Jouw figuurtype: type, kenmerken, de andere types en het advies", async ({ page }) => {
    const res = await page.goto(`/test/${UITSLAG_TOKEN}/figuurtype`);
    expect(res?.status()).toBe(200);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1, name: "Rechthoek" })).toBeVisible();
    await expect(page.getByText("Strakke, grafische lijnen staan je goed")).toBeVisible();
    await expect(page.getByText("Je taille is nauwelijks smaller dan je borst en heupen.")).toBeVisible();
    // De andere figuurtypes, met een vergelijking met het eigen type.
    for (const naam of ["Zandloper", "Peer / driehoek", "Omgekeerde driehoek", "De 8"]) {
      await expect(page.getByRole("heading", { level: 3, name: naam })).toBeVisible();
    }
    await expect(page.getByText(/dan jouw type\.$/).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Download je persoonlijke advies (PDF)" })).toHaveAttribute(
      "href",
      `/api/test/${UITSLAG_TOKEN}/pdf`,
    );
    await expect(page.getByRole("link", { name: /Terug naar je uitslag/ }).first()).toHaveAttribute("href", `/test/${UITSLAG_TOKEN}`);
  });

  test("zonder afgeronde, betaalde test geen figuurtype", async ({ page, request }) => {
    expect((await request.get(`/test/onbekende-link/figuurtype`)).status()).toBe(404);
    expect((await request.get(`/test/${TEST_TOKEN}/figuurtype`)).status()).toBe(404);
    expect((await request.get(`/api/test/onbekende-link/pdf`)).status()).toBe(404);
    const weigering = await request.post(`/api/test/onbekende-link`, { data: {} });
    expect(weigering.status()).toBe(403);

    await page.goto("/test/onbekende-link");
    const tekst = await page.locator("body").innerText();
    for (const naam of TYPENAMEN) expect(tekst, naam).not.toContain(naam);
  });

  test("de silhouetkeuze in de test", async ({ page }) => {
    await naarSilhouetStap(page);
    const keuze = page.getByRole("radio", { name: /Rechthoek/ });
    await expect(page.getByRole("radio")).toHaveCount(5);
    await page.locator("label").filter({ hasText: "Rechthoek" }).click();
    await expect(keuze).toBeChecked();
  });
});

/** Vult de eerste stappen van de test in tot de silhouetkeuze. */
async function naarSilhouetStap(page: Page) {
  const volgende = async (stap: string) => {
    await page.getByRole("button", { name: `Volgende: ${stap} →` }).click();
    await expect(page.getByRole("heading", { level: 1, name: stap, exact: true })).toBeVisible();
  };
  const maat = async (titel: string, waarde: string) => {
    const kaart = page.locator("section").filter({ has: page.getByRole("heading", { name: titel, exact: true }) });
    await kaart.getByRole("textbox", { name: /^1e meting/ }).fill(waarde);
    await kaart.getByRole("textbox", { name: /^2e meting \(controle\)/ }).fill(waarde);
  };
  await page.goto(`/test/${TEST_TOKEN}`);
  await page.getByRole("textbox", { name: /^Lengte/ }).fill("170");
  await page.getByRole("textbox", { name: /^Gewicht/ }).fill("65");
  await volgende("Bovenlichaam");
  await maat("Borstomvang", "92");
  await volgende("Taille");
  await maat("Tailleomvang", "85");
  await maat("Hoge heupomvang", "90");
  await volgende("Heupen en benen");
  await maat("Heupomvang", "95");
  await volgende("Silhouet");
}
