# Back-up en herstel

Er zijn twee soorten back-ups: die van **Supabase zelf** (de hele database, terug
te zetten met een paar klikken) en een **eigen download** uit het beheer (een
kopie in je eigen bezit, controleerbaar en terug te zetten in een testproject).

## 1. Back-ups van Supabase

Wat Supabase bewaart hangt af van het abonnement van het productieproject. Kijk in
Supabase → project → **Database → Backups**:

| Abonnement | Back-ups (bij schrijven van deze handleiding) |
| --- | --- |
| Free | geen terug te zetten back-ups: maak zelf regelmatig een download (zie 2) |
| Pro | dagelijkse back-up, 7 dagen bewaard |
| Team / Enterprise | dagelijks, 14 tot 30 dagen |
| Point-in-time recovery (PITR) | betaalde add-on op Pro en hoger: terug naar elk moment (op de seconde) |

Controleer de actuele voorwaarden op supabase.com/pricing.

**Terugzetten (hele database):** Database → Backups → kies het moment → **Restore**.
Dit zet de **hele** database terug: alles wat daarna is gebeurd (bestellingen,
berichten, wijzigingen) is weg. Het project is tijdens het terugzetten enkele
minuten onbereikbaar. Doe dit alleen bij een echte ramp, en maak eerst een eigen
download van de huidige stand (zie 2), zodat je losse gegevens van daarna nog kunt
terughalen.

Een **losse fout** (bijvoorbeeld één verwijderde pagina) herstel je liever niet met
een volledige restore:

- teksten, pagina's en blogberichten: **Beheer → Website → Prullenbak** en de
  versiegeschiedenis bij pagina's en blogberichten;
- andere gegevens: zet een eigen back-up terug in het **testproject** (zie 4),
  zoek daar de rij op en zet hem met de hand terug.

## 2. Eigen back-up downloaden

**Beheer → Instellingen → Back-up → Download volledige back-up**

- Eén bestand `lida-thiry-backup-JJJJ-MM-DD-UUMM.json.gz` (gecomprimeerde JSON).
- Bevat alle tabellen van de site (bestellingen, relaties, nieuwsbrief, blog,
  pagina's, teksten, instellingen, kortingscodes, cadeaubonnen, reviews, afspraken,
  media-gegevens, doorverwijzingen, versies, logboek, foutlog, adviestypes,
  lichaamstypes, beeldbank …), tabel voor tabel opgehaald per 1000 rijen.
- Plus een **manifest**: tijdstip, project, aantal rijen per tabel, de volgorde
  voor terugzetten en per opslag-bucket het aantal bestanden en de grootte.
- **Niet** in de back-up:
  - **bestanden in de opslag** (advies-PDF's, facturen, afbeeldingen van media,
    blog, nieuwsbrief en beeldbank). Die kunnen samen honderden MB's zijn en passen
    niet in één download vanuit een serverless functie. Het manifest noemt wel per
    bucket hoeveel bestanden er waren. De advies-PDF's en facturen zijn opnieuw te
    maken uit de gegevens; afbeeldingen bewaar je best ook zelf (originelen).
    Wil je ze toch kopiëren: Supabase Storage is S3-compatibel (Project Settings →
    Storage → S3 Access Keys), zodat een tool als `rclone` of de Supabase CLI een
    hele bucket kan downloaden.
  - `rate_limits` (vluchtige tellers) en `push_abonnementen` (per apparaat opnieuw
    aanzetten);
  - inloggegevens (Supabase Auth). De tabel `beheerders` zit er wel in, maar wordt
    niet teruggezet: maak beheerders opnieuw aan met `scripts/maak-beheerder.mjs`.

Het bestand bevat **persoonsgegevens van klanten**. Bewaar het versleuteld (bijv.
een versleutelde schijf of je wachtwoordkluis), niet in je mail of een gedeelde map,
en ruim oude kopieën op.

**Advies:** download minstens eens per week een back-up (zeker op het gratis
abonnement) en altijd vóór een grote wijziging of migratie.

## 3. Back-up controleren

**Beheer → Instellingen → Back-up → Back-up controleren**: kies een gedownload
bestand. Het wordt in je browser gelezen (niet geüpload) en gecontroleerd:

- is het een volledige back-up (formaat, versie, manifest aan het eind — een
  afgebroken download valt hier af)?
- klopt het aantal rijen per tabel met het manifest, en heeft elke rij een sleutel?
- de aantallen per tabel naast die van nu in de database.

Vanuit het beheer wordt **nooit** iets teruggezet.

## 4. Een back-up terugzetten in het testproject

Met `scripts/backup-terugzetten.mjs`, bij voorkeur in het testproject uit
[testomgeving.md](testomgeving.md) (alle migraties moeten daar al zijn uitgevoerd).

```bash
PRODUCTIE_SUPABASE_REF=<productie-ref> \
node scripts/backup-terugzetten.mjs lida-thiry-backup-2026-10-04-1505.json.gz \
  --url https://<test-ref>.supabase.co \
  --sleutel <service-role-sleutel-van-het-testproject> \
  [--alleen-inhoud] [--tabellen orders,relaties] [--droog]
```

- Tabel voor tabel, in de volgorde uit het manifest (eerst tabellen waar andere naar
  verwijzen), in porties van 500 rijen, met **upsert** op de primaire sleutel:
  bestaande rijen worden overschreven, rijen die niet in de back-up staan blijven
  staan.
- `lichaamstypes.beeld_id` en `beelden.figuur` verwijzen naar elkaar; `beeld_id`
  wordt daarom eerst leeg gezet en na de beeldbank ingevuld.
- Tabellen met een automatisch nummer (`beheer_log`, `blog_ai_gebruik`,
  `nb_klikken`) worden alleen in een lege tabel gezet (met nieuwe nummers).
- `--alleen-inhoud`: alleen inhoud en instellingen, geen klantgegevens.
- `--droog`: toont alleen wat er zou gebeuren.

**Veiligheid:** het script weigert als het doel de productiedatabase is
(`PRODUCTIE_SUPABASE_URL` of `PRODUCTIE_SUPABASE_REF`, uit de omgeving of
`.env.local`). Is geen van beide ingesteld, dan weigert het ook, omdat het dan niet
te controleren is. Alleen met `--ik-weet-het-zeker` gaat het toch door. Doe dat in
productie alleen als laatste redmiddel, nadat een restore via Supabase (zie 1)
geen optie bleek, en maak eerst een verse download.

## 5. Automatische back-up (niet ingericht)

Een wekelijkse automatische back-up naar een privé-bucket `backups` is bewust nog
niet gebouwd: het Hobby-abonnement van Vercel staat maar één cron-run per dag toe
(die al gebruikt wordt voor de nachtelijke controle), en een back-up in dezelfde
Supabase-omgeving beschermt niet tegen het kwijtraken van dat project. Liever: het
Pro-abonnement van Supabase (dagelijkse back-ups) en daarnaast zelf periodiek
downloaden.
