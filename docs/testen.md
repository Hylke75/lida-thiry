# Testen

De site heeft drie soorten automatische tests:

| Soort | Gereedschap | Waar | Commando |
| --- | --- | --- | --- |
| Unittests | [Vitest](https://vitest.dev) | `src/**/*.test.ts` | `npm test` |
| End-to-end (e2e) | [Playwright](https://playwright.dev) | `e2e/*.spec.ts` | `npm run e2e:lokaal` |
| Toegankelijkheid | Playwright + [axe-core](https://github.com/dequelabs/axe-core-npm) | `e2e/toegankelijkheid.spec.ts` | (zit in `e2e:lokaal`) |

Alle drie draaien automatisch in GitHub Actions bij elke pull request en elke push
naar `main` (`.github/workflows/ci.yml`).

---

## 1. Unittests (Vitest)

Snelle tests voor losse functies: regels, berekeningen, validatie, opmaak, API-routes
met nagebootste afhankelijkheden. Ze hebben geen database, browser of server nodig.

```bash
npm test              # alles één keer
npm run test:watch    # opnieuw bij elke wijziging
npx vitest run src/lib/contact   # alleen een map
```

- Een test staat naast de code in een `__tests__`-map of als `*.test.ts`.
- `vitest.config.ts` neemt alleen `src/**/*.test.ts` mee; de Playwright-specs in
  `e2e/` doen dus niet mee.
- `server-only` wordt in tests vervangen door een leeg bestand (`src/test/server-only.ts`).

## 2. End-to-end-tests (Playwright)

Deze tests openen de echte site in een browser (Chromium) en doen wat een bezoeker
doet: pagina's openen, formulieren invullen, op knoppen klikken.

| Bestand | Wat |
| --- | --- |
| `e2e/publiek.spec.ts` | Rooktests: homepage, bestellen, blog, contact, privacy, voorwaarden, de Nederlandse 404, `robots.txt`, `sitemap.xml`, de RSS-feed en het webmanifest. |
| `e2e/formulieren.spec.ts` | Contactformulier en nieuwsbriefaanmelding: leeg of ongeldig versturen geeft foutmeldingen en er gaat niets naar de server. |
| `e2e/bestellen.spec.ts` | Het bestelformulier: verplichte velden, wat er naar `/api/bestellen` gaat (nagebootst antwoord) en foutmeldingen. De echte betaling tot de Mollie-checkout alleen met `E2E_BESTELFLOW=1`. |
| `e2e/admin.spec.ts` | Het beheer: zonder inlog altijd naar de inlogpagina. Ingelogde tests alleen met `E2E_ADMIN_EMAIL` en `E2E_ADMIN_WACHTWOORD`. |
| `e2e/toegankelijkheid.spec.ts` | Toegankelijkheid (zie hieronder). |
| `e2e/test-flow.spec.ts` | De volledige gratis flow (bestelling → test invullen → PDF). Alleen tegen een omgeving met `GRATIS_TEST` en een testdatabase; maakt echte bestellingen aan. |

De tests kijken naar vaste koppen, landmarks (kop, menu, hoofdinhoud, voettekst) en
links, **niet** naar teksten uit de database. Zo slagen ze ook als de database niet
bereikbaar is en de site zijn standaardteksten toont.

### Lokaal draaien: `npm run e2e:lokaal`

Het makkelijkste: één commando dat alles regelt (`scripts/e2e-lokaal.mjs`).

```bash
npm run e2e:lokaal                          # bouwen, starten en alle specs draaien
npm run e2e:lokaal -- --geen-build          # vorige e2e-build hergebruiken (sneller)
npm run e2e:lokaal -- e2e/publiek.spec.ts   # één bestand
npm run e2e:lokaal -- --headed              # met zichtbare browser
npm run e2e:lokaal -- --alleen-server       # alleen de testsite starten (Ctrl+C stopt)
```

Wat het script doet:

1. Start een **nep-database** op `127.0.0.1:54329`. Die kent alleen een pagina
   "contact" (voor het contactformulier) en een prijs (zodat het bestelformulier
   verschijnt). Al het andere geeft een fout, dus de site valt terug op de
   standaardteksten, net als bij een storing.
2. Bouwt de site (`next build`) met **dummywaarden** voor alle sleutels. Er zijn
   geen echte geheimen nodig; e-mail (Resend), betalingen (Mollie) en AI staan uit.
3. Start `next start` op `http://localhost:3100` en wacht tot die antwoordt.
4. Draait Playwright en stopt daarna de server en de nep-database.

Eerste keer op je eigen computer: installeer de browser met
`npx playwright install chromium`. Poorten aanpassen kan met `E2E_POORT` en
`E2E_DB_POORT`; met `E2E_SERVERLOG=1` zie je de serverlog (veel verwachte
databasefouten).

### Tegen een andere omgeving: `npm run e2e`

`npm run e2e` draait Playwright tegen het adres in `E2E_BASE_URL` (of `BASE_URL`).
Zonder adres slaan alle specs zichzelf over.

```bash
# Tegen je eigen `npm run dev` (eigen .env.local):
E2E_BASE_URL=http://localhost:3000 npm run e2e

# Tegen een Vercel-preview achter Deployment Protection:
E2E_BASE_URL=https://lida-thiry-git-mijn-tak.vercel.app \
VERCEL_AUTOMATION_BYPASS_SECRET=… npm run e2e -- e2e/publiek.spec.ts e2e/toegankelijkheid.spec.ts

# Playwright start zelf `next start` op poort 3100 (na een eigen `npm run build`):
E2E_WEBSERVER=1 npm run e2e
```

> **Nooit tegen productie.** `test-flow.spec.ts` en de bestelflow met
> `E2E_BESTELFLOW=1` maken echte bestellingen aan. Gebruik een preview met een
> aparte testdatabase (zie `docs/testomgeving.md`).

Omgevingsvariabelen voor de tests:

| Variabele | Effect |
| --- | --- |
| `E2E_BASE_URL` / `BASE_URL` | Adres van de site die getest wordt. |
| `E2E_ADMIN_EMAIL`, `E2E_ADMIN_WACHTWOORD` | Ingelogde beheertests (testbeheerder zonder tweestapsverificatie). |
| `E2E_BESTELFLOW=1` | Echte bestelling tot de Mollie-checkout (Mollie-testsleutel nodig). |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Toegang tot een beveiligde Vercel-preview. |
| `E2E_CHROMIUM_PATH` | Eigen Chromium gebruiken (als de meegeleverde niet past). |

Bij een fout bewaart Playwright een trace in `test-results/`. Bekijk die met
`npx playwright show-trace test-results/<test>/trace.zip`.

## 3. Toegankelijkheid (axe)

`e2e/toegankelijkheid.spec.ts` controleert met axe-core de belangrijkste publieke
pagina's op de regels van **WCAG 2.1 niveau A en AA**: homepage, bestellen, blog,
contact, privacy, voorwaarden, cadeaubon, afspraak, mijn advies, de inlogpagina van
het beheer en de 404-pagina. Daarnaast het contactformulier mét foutmeldingen en
het uitgeklapte menu op een telefoonscherm.

- De test **faalt** bij problemen met impact *serious* of *critical* (bijvoorbeeld
  te weinig kleurcontrast, velden zonder label, knoppen zonder naam).
- Lichtere bevindingen (*moderate*, *minor*) laten de test niet falen; ze staan als
  bijlage `axe-lichte-bevindingen.txt` bij de test in het rapport.
- Elke pagina moet precies één `h1` hebben.

Veelvoorkomende oorzaak van een fout: te lichte tekst. Gebruik voor gewone tekst
minimaal `text-foreground/70` (contrast ≥ 4,5:1 op de achtergrond en op kaarten);
`/50` en `/60` zijn te licht. De accentkleur (`--accent` in `globals.css`) is zo
gekozen dat hij als tekst op de achtergrond en op `bg-accent-zacht` voldoet, en als
achtergrond van knoppen met `text-background`.

Lokaal alleen de toegankelijkheidstests:

```bash
npm run e2e:lokaal -- e2e/toegankelijkheid.spec.ts
```

## 4. In GitHub Actions (CI)

`.github/workflows/ci.yml` heeft twee jobs:

- **check**: `npm run lint`, `npx vitest run` en `npm run build`.
- **e2e**: installeert Chromium (`npx playwright install --with-deps chromium`) en
  draait `npm run e2e:lokaal`. Er zijn geen secrets nodig. Bij een fout staan de
  traces als artefact `playwright-resultaten` bij de run.

`.github/workflows/e2e-preview.yml` draait na elke geslaagde Vercel-preview
(`deployment_status`) de rooktests, formuliertests, beheertests en
toegankelijkheidstests tegen het adres van die preview (niet tegen productie).
Zet in GitHub → Settings → Secrets and variables → Actions:

- `VERCEL_AUTOMATION_BYPASS_SECRET` als de previews beveiligd zijn (Vercel →
  Project → Settings → Deployment Protection → Protection Bypass for Automation);
- optioneel `E2E_ADMIN_EMAIL` en `E2E_ADMIN_WACHTWOORD` voor de ingelogde
  beheertests (alleen een testbeheerder op de testdatabase).

## 5. Laadtijd meten: `npm run snelheid`

Geen test, maar een handige meting (`scripts/meet-snelheid.mjs`): vraagt een paar
publieke pagina's een aantal keer op (na één opwarmverzoek) en toont per pagina de
p50, p95 en het maximum in milliseconden. Alleen GET-verzoeken zonder cookies, na
elkaar; elk verzoek heeft een tijdslimiet van 60 s (`MEET_TIJDSLIMIET_MS`).

```bash
npm run snelheid                                            # http://localhost:3000, 10× per pagina
npm run snelheid -- https://preview.example.vercel.app 20   # andere omgeving, 20×
npm run snelheid -- http://localhost:3000 10 / /blog        # alleen deze paden
```

Het basisadres kan ook via `MEET_BASIS`. Meet bij voorkeur tegen een productiebuild
(`npm run build && npm start`) of een Vercel-preview; `npm run dev` is veel trager.
