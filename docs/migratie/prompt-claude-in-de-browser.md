# Prompt: inhoud van de oude website verzamelen (Claude in de browser)

Kopieer alles onder de streep naar Claude in Chrome, met www.lidathiry.nl open in het tabblad.

---

Je helpt mij de inhoud van mijn oude website **https://www.lidathiry.nl** over te zetten naar een nieuwe website. Verzamel de inhoud hieronder en lever die aan in het opgegeven formaat. Een ander systeem leest het daarna automatisch in. Volg deze regels:

**Regels**
- **Neem tekst letterlijk over.** Herschrijf, vat samen of verbeter niets, ook geen spelfouten. Gebruik de opmaak in Markdown: `##` voor koppen, `-` voor lijsten, `**vet**`, `[linktekst](url)`.
- **Alleen lezen.** Log nergens in, vul geen formulieren in, plaats niets in een winkelwagen en klik niet op betaalknoppen. Accepteer hooguit de cookiemelding als die de pagina blokkeert.
- **Kun je iets niet vinden?** Schrijf dan `ONBEKEND`. Verzin nooit iets: geen prijzen, geen reviews, geen jaartallen.
- **Noteer bij elk onderdeel de URL** waar je het gevonden hebt.
- **Begin met de overzichten.** Het is een WordPress-site. Probeer eerst deze adressen, want daar staat veel tegelijk:
  - `https://www.lidathiry.nl/sitemap_index.xml` (of `/sitemap.xml`, `/wp-sitemap.xml`) voor de lijst van alle pagina's en berichten
  - `https://www.lidathiry.nl/wp-json/wp/v2/pages?per_page=100` voor de pagina's
  - `https://www.lidathiry.nl/wp-json/wp/v2/posts?per_page=100&page=1` voor de blogberichten (ga door met `page=2`, `page=3` … tot er niets meer komt)
  - `https://www.lidathiry.nl/wp-json/wp/v2/categories?per_page=100` en `/wp-json/wp/v2/tags?per_page=100`
  - `https://www.lidathiry.nl/wp-json/wp/v2/media?per_page=100` voor de afbeeldingen (`source_url`, `alt_text`, `media_details.width`/`height`)

  Werken die adressen niet? Loop dan de menu's, de footer en de blogoverzichtspagina's na.
- **Lever per onderdeel een apart bericht.** Zo worden de berichten niet te lang. Begin elk bericht met de kop van het onderdeel, bijvoorbeeld `### 7. Blogberichten (deel 1 van 3)`. Zet JSON altijd in een ```json-codeblok. De JSON moet geldig zijn: dubbele aanhalingstekens, en tekst met regeleinden als `\n`.

---

### 1. Bedrijfsgegevens
Zoek in de footer, op de contactpagina, in de algemene voorwaarden en in de privacyverklaring.
```json
{
  "bedrijfsnaam": "",
  "eigenaar": "",
  "adres": "",
  "postcode": "",
  "plaats": "",
  "telefoon": "",
  "email": "",
  "kvk_nummer": "",
  "btw_nummer": "",
  "iban": "",
  "werkgebied_of_locatie": "",
  "openingstijden_of_bereikbaarheid": "",
  "socials": { "instagram": "", "facebook": "", "pinterest": "", "linkedin": "", "youtube": "", "overig": [] },
  "logo_url": "",
  "favicon_url": "",
  "bron_urls": []
}
```

### 2. Aanbod en prijzen
Neem elke dienst en elk product op dat te koop of te boeken is. Denk aan kleuranalyse, stijladvies, figuuradvies, KLOA, STOA, DIY-kleuranalyse, Personal Color Cards, workshops, cadeaubonnen en garderobe-advies.
```json
[
  {
    "naam": "",
    "soort": "dienst | product | cadeaubon | workshop",
    "korte_omschrijving": "",
    "volledige_tekst_markdown": "",
    "prijs_eur": 0.00,
    "prijs_tekst_letterlijk": "",
    "inclusief_btw": true,
    "duur": "",
    "locatie": "thuis | studio | online | op locatie | ONBEKEND",
    "wat_krijg_je": [],
    "hoe_werkt_het": [],
    "verzendkosten": "",
    "afbeelding_urls": [],
    "url": ""
  }
]
```

### 3. Over Lida
Neem de volledige tekst van de over-mij-pagina letterlijk over. Noteer ook de feiten die erin staan, en elke quote of slogan die op de site staat.
```json
{
  "paginatitel": "",
  "url": "",
  "tekst_markdown": "",
  "feiten": {
    "jaren_ervaring": "",
    "sinds_jaar": "",
    "opleidingen_en_certificaten": [],
    "achtergrond": "",
    "lidmaatschappen": []
  },
  "quotes_en_slogans": [{ "tekst": "", "url": "" }],
  "portretfoto_urls": []
}
```

### 4. Foto's
Maak één lijst van alle bruikbare foto's. Neem steeds de grootste versie: de `source_url` uit `wp-json/wp/v2/media`, of de URL zonder `-300x200` in de bestandsnaam. Sla iconen, logo's van andere bedrijven en kleine knopjes over. Geef aan wat er op de foto staat, zodat ik kan kiezen.
```json
[
  {
    "url": "",
    "breedte": 0,
    "hoogte": 0,
    "alt_tekst_op_site": "",
    "wat_staat_erop": "",
    "is_lida_zelf": true,
    "geschikt_voor": "hero | over-lida | dienst | sfeer | blog | logo",
    "gevonden_op_url": ""
  }
]
```

### 5. Contact
```json
{
  "url": "",
  "intro_tekst_markdown": "",
  "formulier_velden": [],
  "afspraak_of_belinfo": "",
  "route_of_adresinfo": ""
}
```

### 6. Reviews en ervaringen
Neem alles over wat als review, ervaring of testimonial op de site staat, letterlijk en volledig. Neem ook reviews mee die als widget op de site getoond worden, zoals Google of Facebook. Verzin niets en vul niets aan.
```json
[
  {
    "naam_zoals_getoond": "",
    "tekst": "",
    "sterren": null,
    "datum": "",
    "dienst": "",
    "bron": "website | google | facebook | overig",
    "url": ""
  }
]
```

### 7. Blogberichten
Neem alle berichten op, geen selectie. Zet de volledige tekst om naar Markdown: `##`/`###` voor koppen, lijsten met `-`, links als `[tekst](url)` en afbeeldingen als `![alt](url)`. Laat knoppen, deelknoppen en "lees ook"-blokken weg. Lever ze in delen van ongeveer 5 berichten per bericht.
```json
[
  {
    "titel": "",
    "oude_url": "",
    "slug": "",
    "publicatiedatum": "JJJJ-MM-DD",
    "categorieen": [],
    "tags": [],
    "samenvatting_of_excerpt": "",
    "meta_description": "",
    "uitgelichte_afbeelding_url": "",
    "uitgelichte_afbeelding_alt": "",
    "inhoud_markdown": "",
    "aantal_reacties": 0
  }
]
```

### 8. Overige pagina's (voor doorverwijzingen)
Geef een lijst van alle URL's van de site: pagina's, productpagina's, categorie- en tagpagina's. Zo kunnen oude links straks doorverwijzen.
```json
[
  { "url": "", "titel": "", "soort": "pagina | bericht | product | categorie | tag | overig", "kort_doel": "" }
]
```
Neem van pagina's die geen blogbericht, dienst, over- of contactpagina zijn de volledige tekst op:
```json
[
  { "url": "", "titel": "", "tekst_markdown": "", "afbeelding_urls": [] }
]
```

### 9. Veelgestelde vragen
```json
[ { "vraag": "", "antwoord_markdown": "", "url": "" } ]
```

### 10. Homepage-teksten
Neem de teksten van de huidige homepage letterlijk over: koppen, intro's, knopteksten, slogans, "voor wie" en "hoe werkt het".
```json
{
  "url": "",
  "blokken": [ { "kop": "", "tekst_markdown": "", "knoptekst": "", "knoplink": "" } ]
}
```

### 11. Nieuwsbrief
```json
{
  "aanmeldtekst": "",
  "waar_op_de_site": [],
  "aanbod_bij_aanmelding": "",
  "dienst_zichtbaar": "mailchimp | mailpoet | laposta | overig | ONBEKEND"
}
```

### 12. Juridisch
Neem de volledige tekst letterlijk over, met de datum "laatst bijgewerkt" als die er staat.
```json
{
  "privacyverklaring": { "url": "", "bijgewerkt": "", "tekst_markdown": "" },
  "algemene_voorwaarden": { "url": "", "bijgewerkt": "", "tekst_markdown": "" },
  "cookieverklaring": { "url": "", "bijgewerkt": "", "tekst_markdown": "" },
  "retourbeleid_of_herroeping": { "url": "", "tekst_markdown": "" }
}
```

### 13. Afronding
Sluit af met één bericht met:
- een lijst van onderdelen waar je `ONBEKEND` hebt ingevuld, met de reden;
- pagina's die je niet kon openen;
- je inschatting van het totaal: aantal blogberichten, foto's en reviews.

Begin met onderdeel 1.
