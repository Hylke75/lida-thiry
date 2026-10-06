# lida-thiry

De website van **Lida Thiry Imago & Kledingadvies**. De kern is een online
kledingadviestest: een bezoeker bestelt en betaalt (Mollie), meet zichzelf op,
beantwoordt een paar vragen en krijgt direct een persoonlijk advies over haar
figuurtype als PDF. Daaromheen:

- **publieke site**: homepage, eigen pagina's, blog (met RSS), contactformulier,
  reviews, cadeaubonnen, afspraken boeken (met aanbetaling), nieuwsbriefaanmelding,
  privacyverklaring en voorwaarden;
- **beheer** (`/admin`, alleen voor beheerders, met tweestapsverificatie): bestellingen,
  adresboek, berichten, nieuwsbrieven (campagnes, automatische mails, A/B-tests),
  blog (met AI-schrijfhulp), pagina's en homepage, beeldbank en mediabibliotheek,
  adviesteksten per figuurtype, kortingscodes, statistieken, logboek, fouten,
  versiegeschiedenis, back-ups en pushmeldingen (installeerbaar als app).

## Stack

- **Next.js 16** (App Router, `src/`-map, import-alias `@/*`). Let op: deze versie
  wijkt af van oudere Next.js (bijv. `src/proxy.ts` in plaats van middleware); zie
  `AGENTS.md` en `node_modules/next/dist/docs/`.
- **React 19**, **TypeScript**, **Tailwind CSS v4**
- **Supabase** (Postgres, Auth, Storage) via `@supabase/ssr` en `@supabase/supabase-js`
- **Mollie** (betalingen), **Resend** (mail), **@react-pdf/renderer** (PDF's),
  **web-push** (pushmeldingen), **Anthropic** (AI-schrijfhulp in het blogbeheer)
- **Vitest** (unittests) en **Playwright** + axe-core (end-to-end en toegankelijkheid)
- Hosting op **Vercel** (Node 24, zie `engines` in `package.json`)

## Lokaal starten

```bash
cp .env.example .env.local   # en vul de geheimen in (zie hieronder)
npm install
npm run dev                  # http://localhost:3000
```

Een eerste beheerder maak je met `node scripts/maak-beheerder.mjs <e-mailadres>`
(gebruikt `SUPABASE_SERVICE_ROLE_KEY` en `NEXT_PUBLIC_SUPABASE_URL` uit `.env.local`);
inloggen gaat daarna via `/admin/inloggen`.

## Omgevingsvariabelen

Alle variabelen staan met uitleg in [`.env.example`](.env.example). In het kort:

| Groep | Variabelen |
| --- | --- |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| Site | `NEXT_PUBLIC_SITE_URL`, `BEHEER_EMAIL` |
| Betalen | `MOLLIE_API_KEY`, `GRATIS_TEST` (alleen `1` zet bestellen zonder betalen aan; nooit in productie) |
| Mail | `RESEND_API_KEY`, `RESEND_VAN`, `RESEND_WEBHOOK_SECRET` |
| Geheimen | `CRON_SECRET`, `LINK_GEHEIM`, `NIEUWSBRIEF_GEHEIM` |
| Blog | `ANTHROPIC_API_KEY` |
| Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (maak ze met `node scripts/vapid-sleutels.mjs`) |
| Testomgeving | `PRODUCTIE_SUPABASE_REF` (of `PRODUCTIE_SUPABASE_URL`) |

Beheer → **Klaar voor livegang** controleert of alles goed staat.

## Scripts

| Commando | Wat |
| --- | --- |
| `npm run dev` | Ontwikkelserver op http://localhost:3000 |
| `npm run build` / `npm start` | Productiebuild maken en starten |
| `npm run lint` | ESLint |
| `npm test` / `npm run test:watch` | Unittests (Vitest) |
| `npx next typegen && npx tsc --noEmit` | Typecontrole (typegen maakt eerst de routetypes) |
| `npm run e2e:lokaal` | Bouwt een testsite zonder database en draait alle Playwright-tests |
| `npm run e2e` | Playwright tegen een andere omgeving (zie `docs/testen.md`) |
| `npm run snelheid` | Laadtijden van de publieke pagina's meten |
| `npm run migraties:bundelen` | Alle migraties in één bestand (`supabase/alle-migraties.sql`) voor een nieuw, leeg Supabase-project |

Losse scripts in `scripts/`: `maak-beheerder.mjs`, `vapid-sleutels.mjs` en
`backup-terugzetten.mjs` (een back-up terugzetten in de testdatabase).

## Geplande taken (crons)

In [`vercel.json`](vercel.json); Vercel stuurt `CRON_SECRET` mee als Bearer-token.

| Pad | Wanneer (UTC) | Wat |
| --- | --- | --- |
| `/api/onderhoud/opschonen` | dagelijks 03:00 | Oude lichaamsmaten anonimiseren, vastgelopen betalingen en adviezen afronden, herinneringen (test, betaling, afspraak), reviewuitnodigingen, geplande cadeaubonnen, logboek opruimen |
| `/api/nb/verwerk` | dagelijks 07:00 | Nieuwsbrieven: ingeplande campagnes starten, automatische mails inplannen, de wachtrij versturen, onbevestigde aanmeldingen opruimen |

## Documentatie

- [`docs/testen.md`](docs/testen.md): unittests, e2e, toegankelijkheid, CI en laadtijd meten
- [`docs/testomgeving.md`](docs/testomgeving.md): een aparte testdatabase voor Vercel-previews
- [`docs/backup-en-herstel.md`](docs/backup-en-herstel.md): back-ups maken en terugzetten

## Belangrijke mappen

- `src/app/`: pagina's en API-routes (`src/app/admin/` is het beheer)
- `src/lib/`: logica, zonder imports uit `src/app/`. Pure regels (`*regels.ts`) zijn
  los te testen; gedeelde hulpjes o.a. in `datum.ts`, `prijs.ts`, `email.ts`,
  `slug.ts`, `opslag.ts` (bucketnamen) en `uitkomst.ts`
- `src/lib/supabase/`: clients voor browser (`client.ts`), server (`server.ts`) en
  service-role (`admin.ts`); `sessie.ts` ververst de sessie vanuit `src/proxy.ts`
- `src/components/`: gedeelde componenten
- `supabase/migrations/`: databasemigraties (op volgorde van bestandsnaam)
- `e2e/`: Playwright-tests

## Uitrollen

- Vercel rolt automatisch uit bij een push naar de productiebranch; elke pull request
  krijgt een preview. CI (`.github/workflows/ci.yml`) draait lint, typecontrole,
  unittests, build en e2e.
- **Migraties**: elke nieuwe migratie in `supabase/migrations/` moet op de
  productiedatabase (en de testdatabase) zijn toegepast vóórdat de code die erop
  rekent live gaat, bijv. via de SQL Editor van Supabase. Maak eerst een back-up.
- **In productie verplicht**: `LINK_GEHEIM` en `NIEUWSBRIEF_GEHEIM` (eigen, lange
  willekeurige geheimen). Zonder deze geheimen werken betaalherinneringslinks en
  nieuwsbrieven niet. Wissel ze niet zonder reden: links in verstuurde mails worden
  dan ongeldig.
- Zet in productie nooit `GRATIS_TEST`, en gebruik de live-sleutel van Mollie.

## Infrastructuur

- **Supabase**: project `lida-thiry`, ref `hzuhkollroehnrsghyax`, regio `eu-central-1`
- **Vercel**: project `hylke-s-projects/lida-thiry`, gekoppeld aan deze GitHub-repo
