import { test, expect } from "@playwright/test";

// Het beheer. Zonder inlog moet alles naar de inlogpagina gaan. De ingelogde
// tests draaien alleen met E2E_ADMIN_EMAIL en E2E_ADMIN_WACHTWOORD (een
// testbeheerder zonder tweestapsverificatie, op een testdatabase).
test.skip(!process.env.E2E_BASE_URL, "E2E_BASE_URL is niet gezet (zie playwright.config.ts).");

const EMAIL = process.env.E2E_ADMIN_EMAIL;
const WACHTWOORD = process.env.E2E_ADMIN_WACHTWOORD;

test.describe("zonder inlog", () => {
  for (const pad of ["/admin", "/admin/bestellingen", "/admin/teksten"]) {
    test(`${pad} stuurt door naar de inlogpagina`, async ({ page }) => {
      await page.goto(pad);
      await expect(page).toHaveURL(/\/admin\/inloggen/);
      await expect(page.getByRole("heading", { level: 1, name: "Beheer — inloggen" })).toBeVisible();
    });
  }

  test("inlogpagina toont het formulier zonder sitemenu", async ({ page }) => {
    await page.goto("/admin/inloggen");
    await expect(page.getByRole("navigation", { name: "Hoofdmenu" })).toHaveCount(0);
    await expect(page.getByLabel("E-mailadres")).toBeVisible();
    await expect(page.getByLabel("Wachtwoord")).toBeVisible();
  });

  test("beheerexport zonder inlog geeft geen gegevens", async ({ request }) => {
    const res = await request.get("/admin/adresboek/export", { maxRedirects: 0 });
    expect(res.status()).not.toBe(200);
  });

  test("verkeerd wachtwoord geeft een foutmelding", async ({ page }) => {
    test.skip(!process.env.E2E_LOKAAL, "Alleen lokaal: geen inlogpogingen op een echte omgeving.");
    await page.goto("/admin/inloggen");
    await page.getByLabel("E-mailadres").fill("niemand@example.com");
    await page.getByLabel("Wachtwoord").fill("fout-wachtwoord");
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await expect(page.getByText("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.")).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/inloggen/);
  });
});

test.describe("ingelogd", () => {
  test.skip(!EMAIL || !WACHTWOORD, "E2E_ADMIN_EMAIL en E2E_ADMIN_WACHTWOORD zijn niet gezet.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/inloggen");
    await page.getByLabel("E-mailadres").fill(EMAIL!);
    await page.getByLabel("Wachtwoord").fill(WACHTWOORD!);
    await page.getByRole("button", { name: "Inloggen", exact: true }).click();
    await page.waitForURL((url) => url.pathname === "/admin", { timeout: 30_000 });
  });

  test("dashboard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Laatste bestellingen" })).toBeVisible();
  });

  test("bestellingen en teksten openen", async ({ page }) => {
    for (const pad of ["/admin/bestellingen", "/admin/teksten"]) {
      const res = await page.goto(pad);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${pad}$`));
      await expect(page.getByRole("main")).toBeVisible();
    }
  });

  test("uitloggen", async ({ page }) => {
    await page.evaluate(() => fetch("/auth/uitloggen", { method: "POST" }));
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/inloggen/);
  });
});
