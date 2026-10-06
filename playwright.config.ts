import { existsSync } from "node:fs";
import { chromium, defineConfig, devices } from "@playwright/test";

/**
 * End-to-end-tests (zie docs/testen.md).
 *
 * - `npm run e2e:lokaal`: bouwt en start de site zelf (zonder database of
 *   geheimen) en draait alle specs ertegen (scripts/e2e-lokaal.mjs).
 * - `npm run e2e`: draait tegen een omgeving die je zelf opgeeft met E2E_BASE_URL
 *   (of BASE_URL), bijv. een lokale `npm run dev` of een Vercel-preview.
 *   Zonder adres slaan de specs zichzelf over.
 * - E2E_WEBSERVER=1: laat Playwright zelf `next start` draaien (na een build).
 *
 * Nooit tegen productie draaien: de bestelflow maakt echte orders aan.
 */
const eigenServer = process.env.E2E_WEBSERVER === "1";
const baseURL =
  process.env.E2E_BASE_URL || process.env.BASE_URL || (eigenServer ? "http://localhost:3100" : undefined);
if (baseURL) process.env.E2E_BASE_URL = baseURL;

/**
 * Past de meegeleverde Chromium niet bij deze Playwright-versie (bijv. in een
 * sandbox met een vooraf geïnstalleerde browser), gebruik dan E2E_CHROMIUM_PATH
 * of /opt/pw-browsers/chromium. In CI installeert de workflow de juiste browser.
 */
function chromiumPad(): string | undefined {
  if (process.env.E2E_CHROMIUM_PATH) return process.env.E2E_CHROMIUM_PATH;
  try {
    if (existsSync(chromium.executablePath())) return undefined;
  } catch {
    // geen browser bekend: val terug op het vaste pad hieronder
  }
  return existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : undefined;
}
const executablePath = chromiumPad();

export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    locale: "nl-NL",
    // Previews achter Vercel Deployment Protection (zie docs/testomgeving.md).
    ...(process.env.VERCEL_AUTOMATION_BYPASS_SECRET
      ? {
          extraHTTPHeaders: {
            "x-vercel-protection-bypass": process.env.VERCEL_AUTOMATION_BYPASS_SECRET,
            "x-vercel-set-bypass-cookie": "true",
          },
        }
      : {}),
  },
  ...(eigenServer
    ? {
        webServer: {
          command: "npx next start -p 3100",
          url: "http://localhost:3100/robots.txt",
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }
    : {}),
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], ...(executablePath ? { launchOptions: { executablePath } } : {}) },
    },
  ],
});
