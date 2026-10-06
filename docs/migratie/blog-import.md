# Blogimport van www.lidathiry.nl (6 oktober 2026)

Alle blogberichten van de oude WordPress-site zijn met foto's overgezet naar de nieuwe site.

## Resultaat

| | |
|---|---|
| Berichten | 559 (2012 – 2026), allemaal gepubliceerd met hun oorspronkelijke datum |
| Foto's | 2183 in de bucket `blog` (map `wp/jaar/maand/`) en in de mediabibliotheek (map "blog"), samen ± 420 MB |
| Omslagfoto's | 545 berichten (14 berichten hadden er op de oude site geen) |
| Doorverwijzingen | 582: `/oude-slug` → `/blog/oude-slug`, de categorie-adressen (`/categorie/…`) → het gefilterde blogoverzicht, `/feed` → `/blog/rss.xml` |
| Categorieën | één per bericht (de meest specifieke); de overige categorieën en de WordPress-tags zijn tags geworden (max. 15) |

## Hoe de omzetting werkt

- `src/lib/blog/wordpress.ts` zet de WordPress-HTML om in de opmaak van de site (`##` koppen, lijsten, **vet**, links, foto's op een eigen regel). Cursief, kleuren en uitlijning bestaan in die opmaak niet en zijn vervallen. YouTube-video's zijn een link geworden ("Bekijk de video: …").
- Links naar andere berichten wijzen nu naar `/blog/…`. Ook links naar oude, hernoemde berichten zijn gevolgd en omgezet.
- De aanmeldbanners van de oude Mailchimp-nieuwsbrief zijn weggelaten (de site heeft een eigen nieuwsbrief). Een omslagfoto die ook bovenaan de tekst stond, staat er nu maar één keer.
- `supabase/functions/blog-import` is de Edge Function die de import heeft gedaan. Na de import is ze uitgeschakeld (ze geeft nu 410). Opnieuw draaien: zet een nieuwe sleutel-hash in `SLEUTEL_SHA256`, deploy de functie (`supabase functions deploy blog-import`) en roep haar per pagina aan (zie de uitleg bovenaan `index.ts`). Bestaande berichten worden dan overgeslagen, tenzij `&overschrijf=1`.

## Nog te doen

### 1. Doorverwijzingen voor de oude pagina's — gedaan (6 oktober 2026)

Voor alle 117 oude adressen waar de berichten nog naar linken, staat nu een doorverwijzing (Beheer → Website → Doorverwijzingen):

| Oude adressen | Naar | Soort |
|---|---|---|
| silhouet-, bodytype- en figuurpagina's (`/het-a-silhouet`, `/zeven-bodytypes/…`, `/bodytypes/…`, `/lichaamsvormen-2/…`, `/figuurproblemen`) — 43 | `/bestellen` (de figuurtest; de figuurtypes staan achter de betaalmuur) | tijdelijk |
| aanbod kleur-/stijladvies (`/kleuradvies-op-afstand`, `/advies/kleuradvies`, `/stijladvies-2` …) en contact (`/contact`, `/advies/contact`) — 16 | `/afspraak` | tijdelijk |
| `/advies/contact/policy` | `/privacy` | tijdelijk |
| oude berichten die niet meer bestaan — 57 | `/blog` | tijdelijk |

"Tijdelijk" (302) betekent dat browsers en Google de doorverwijzing niet onthouden: zodra er een echte pagina komt (bijv. `/contact` of een aanbodpagina), kun je de doorverwijzing aanpassen. Publiceer je een pagina op precies zo'n adres, dan verdwijnt de doorverwijzing vanzelf.

### 2. Vier pdf-downloads staan nog op de oude site

In deze berichten staat een link naar een pdf op `www.lidathiry.nl/wp-content/uploads/…`. Die links werken niet meer als de oude site verdwijnt. Zet de pdf's in de nieuwe site en pas de link aan:

- `beperk-je-tot-tien-kleuren-in-je-kast`
- `handen-wassen-en-andere-zaken`
- `tips-voor-gezonder-haar`
- `vijf-nieuwe-kledingstukken-per-jaar`

### 3. Zeven foto's bestonden op de oude site al niet meer

Deze ontbraken al (404) en zijn weggelaten: één in elk van `drieklank-kleurencombinatie`, `zeven-manieren-om-slanker-te-lijken`, `trendkleuren-combineren-was-nog-nooit-zo-gemakkelijk`, `jouw-ideale-roklengte-bereken-je-zelf` en `laat-strepen-voor-je-werken`, en twee in `kleurencombinaties-met-very-peri-de-kleur-van-het-jaar-2022`.

### 4. Beeldrecht

Een deel van de foto's (bijv. van bekende actrices of uit webshops) is niet van Lida zelf. Op de oude site stonden ze er al. Controleer bij twijfel of ze mogen blijven staan.
