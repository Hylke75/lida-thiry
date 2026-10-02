import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end-tests (npm run e2e). Draaien alleen tegen een expliciet opgegeven
 * omgeving via E2E_BASE_URL (bijv. een lokale `npm run dev` met GRATIS_TEST=1).
 * Nooit tegen productie draaien: de test maakt echte orders aan.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL,
    trace: "retain-on-failure",
    locale: "nl-NL",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
