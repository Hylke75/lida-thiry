# Testomgeving: een aparte database voor previews

Bij elke wijziging in GitHub maakt Vercel een **preview**: een testversie van de site
op een eigen adres (`…vercel.app`). Standaard gebruikt die preview **dezelfde
Supabase-database als de echte site**. Alles wat je in een preview doet is dan echt:
testbestellingen komen in de bestellijst, nieuwsbrieven gaan naar echte contacten,
wijzigingen in teksten staan meteen op de live site, en een fout in nieuwe code kan
echte gegevens beschadigen.

Deze handleiding zet een **tweede, gratis Supabase-project** op dat alleen door
previews wordt gebruikt. Reken op een half uur.

> Het beheer van een preview toont een **rode balk** "Let op: deze preview gebruikt
> de productiedatabase" zolang dit niet goed staat (zie stap 6). De controlelijst
> "Klaar voor livegang" heeft er een punt voor: "Previews gebruiken een aparte
> testdatabase".

---

## 1. Tweede Supabase-project maken (gratis)

1. Ga naar [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Organisatie: dezelfde als de echte site. Naam bijvoorbeeld `lida-thiry-test`.
3. Kies een sterk databasewachtwoord (bewaar het in je wachtwoordkluis).
4. Regio: **Central EU (Frankfurt)**, net als productie.
5. Abonnement: **Free** is genoeg. (Let op: gratis projecten worden na een week
   zonder gebruik gepauzeerd; in het dashboard zet je ze met één klik weer aan.)
6. Wacht tot het project klaar is en noteer via **Project Settings → API**:
   - de **Project URL** (`https://<test-ref>.supabase.co`),
   - de **publishable/anon key**,
   - de **secret/service_role key** (geheim! nooit delen of in code zetten).

## 2. Database inrichten (alle migraties in één keer)

1. Maak lokaal het bundelbestand met alle migraties, op volgorde:

   ```bash
   node scripts/migraties-bundelen.mjs
   ```

   Dit maakt `supabase/alle-migraties.sql` (staat in `.gitignore`; maak het elke
   keer opnieuw, zodat nieuwe migraties meedoen).

2. Open in het **testproject** (controleer de projectnaam linksboven!) de
   **SQL Editor** → **New query**, plak de inhoud van `supabase/alle-migraties.sql`
   en klik **Run**. Het bestand draait in één transactie: gaat er iets mis, dan is
   er niets veranderd en zie je welke regel het probleem gaf.

3. De opslag-buckets (`adviezen-pdf`, `facturen`, `media`, `blog`, `nieuwsbrief`,
   `meetinstructies`, `advies-beelden`) worden door de migraties zelf aangemaakt.
   Controleer in **Storage** dat ze er staan.

> **Nooit** het bundelbestand in het productieproject draaien: die database heeft
> deze migraties al.

**Nieuwe migraties later:** komt er een migratie bij, voer dan alleen dat ene
bestand uit `supabase/migrations/` uit in de SQL Editor van het testproject (en
natuurlijk in productie, zoals altijd).

## 3. Inloggen in het beheer instellen

1. Testproject → **Authentication → URL Configuration**:
   - **Site URL**: het vaste preview-adres, bijvoorbeeld
     `https://lida-thiry-git-main-hylke-s-projects.vercel.app`.
   - **Redirect URLs**: voeg toe `https://*-hylke-s-projects.vercel.app/**`
     (zodat de inloglink op elke preview werkt) en `http://localhost:3000/**`.
2. Maak een beheerder aan. Het makkelijkst met het bestaande script, met de
   gegevens van het **testproject** op de opdrachtregel (die gaan vóór `.env.local`):

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<test-ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-sleutel-van-het-testproject> \
   node scripts/maak-beheerder.mjs jij@voorbeeld.nl
   ```

   Dit maakt de gebruiker aan en zet hem in de tabel `beheerders` (rol eigenaar).

## 4. Inhoud overzetten (optioneel)

Het testproject is leeg: geen adviestypes, lichaamstypes, teksten of pagina's. Zet de
inhoud over uit een back-up van productie, **zonder klantgegevens**:

1. Productie: **Beheer → Instellingen → Back-up → Download volledige back-up**.
2. Zet alleen de inhoud terug in het testproject:

   ```bash
   PRODUCTIE_SUPABASE_REF=<productie-ref> \
   node scripts/backup-terugzetten.mjs lida-thiry-backup-….json.gz \
     --url https://<test-ref>.supabase.co --sleutel <service-role-sleutel-test> \
     --alleen-inhoud
   ```

   `--alleen-inhoud` slaat bestellingen, relaties, contactberichten, afspraken,
   nieuwsbriefcontacten en logboeken over. Zet nooit klantgegevens in een
   testomgeving zonder goede reden (AVG).

Afbeeldingen en PDF's zitten niet in de back-up (zie
[backup-en-herstel.md](backup-en-herstel.md)). Upload in het testproject zo nodig
een paar afbeeldingen via het beheer.

## 5. Vercel: omgevingsvariabelen voor **Preview**

Vercel → project `lida-thiry` → **Settings → Environment Variables**. Zet de
volgende variabelen met **alleen "Preview"** aangevinkt (niet Production!). Bestaat
een variabele al voor alle omgevingen, bewerk hem dan: vink bij de bestaande waarde
Preview uit en voeg een nieuwe waarde toe met alleen Preview.

| Variabele | Waarde voor Preview |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<test-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable/anon key van het testproject |
| `SUPABASE_SERVICE_ROLE_KEY` | service-role-sleutel van het testproject |
| `GRATIS_TEST` | `1` (bestellen zonder betalen, nodig voor de e2e-test) |
| `MOLLIE_API_KEY` | een **test**sleutel (`test_…`), nooit `live_…` |
| `RESEND_API_KEY` | leeg laten (mails mislukken dan en komen in de foutlog), of een Resend-sleutel met afzender `onboarding@resend.dev` (komt alleen aan bij het e-mailadres van het Resend-account) |
| `RESEND_VAN` | leeg laten, of een adres van een apart testdomein |
| `NEXT_PUBLIC_SITE_URL` | leeg laten (dan wordt het preview-adres gebruikt) |
| `RESEND_WEBHOOK_SECRET`, `ANTHROPIC_API_KEY`, `VAPID_*` | leeg laten, tenzij je die functies wilt testen |

En één variabele voor **Production én Preview** (beide aangevinkt):

| Variabele | Waarde |
| --- | --- |
| `PRODUCTIE_SUPABASE_REF` | de ref van het **productie**project (het stukje vóór `.supabase.co` in de productie-URL) |

Met `PRODUCTIE_SUPABASE_REF` herkent een preview dat hij per ongeluk toch de
productiedatabase gebruikt (rode balk in het beheer), en weigert
`scripts/backup-terugzetten.mjs` om in productie te schrijven.

Daarna: **Deployments → … → Redeploy** van de laatste preview (variabelen gelden pas
na een nieuwe build; `NEXT_PUBLIC_…` wordt bij het bouwen ingebakken).

**Goed om te weten**

- De crons (`vercel.json`) draaien alleen op productie, niet op previews.
- Met **Vercel Authentication** (Deployment Protection) op previews kan Mollie de
  webhook van een preview niet bereiken; betalingen in een preview blijven dan
  "open". Test bestellen met `GRATIS_TEST=1`, of zet een
  *Protection Bypass for Automation* aan.
- Lokaal (`npm run dev`) gebruikt `.env.local`. Wil je lokaal ook op de
  testdatabase werken, zet daar dan de testwaarden (en `GRATIS_TEST=1`).

## 6. Controleren

1. Open het beheer van een preview (`https://<preview-adres>/admin`) en log in met
   de beheerder uit stap 3.
2. Er staat **geen** rode balk bovenaan. Op de beheer-homepage staat bij "Klaar voor
   livegang" het punt "Previews gebruiken een aparte testdatabase" op ✓.
3. Maak een testbestelling in de preview: die verschijnt in het beheer van de
   preview, **niet** in het beheer van de echte site.

## 7. End-to-end-tests (Playwright)

De e2e-test (`e2e/test-flow.spec.ts`) maakt echte (gratis) bestellingen aan en mag
daarom **alleen tegen een preview of lokaal** draaien, nooit tegen productie:

```bash
npx playwright install chromium        # eenmalig
E2E_BASE_URL=https://<preview-adres> npm run e2e
```

Staat Deployment Protection aan op previews, maak dan in Vercel → Settings →
Deployment Protection een **Protection Bypass for Automation**-geheim en geef het
mee:

```bash
E2E_BASE_URL=https://<preview-adres> VERCEL_AUTOMATION_BYPASS_SECRET=<geheim> npm run e2e
```

De test vereist `GRATIS_TEST=1` op de preview (stap 5); anders wordt hij
overgeslagen.
