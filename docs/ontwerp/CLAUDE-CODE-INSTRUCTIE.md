# Claude Code — implementatie-instructie

Gebruik de bestanden in deze map als ontwerpbron voor de nieuwe homepage van lidathiry.nl.

## Opdracht

Bouw de bestaande website om naar het ontwerp uit `index.html` + `styles.css`, met behoud van alle bestaande functionele onderdelen, relevante SEO-content, formulieren, analytics en CMS-koppelingen.

### Cruciaal
- Maak het ontwerp visueel zo exact mogelijk na.
- Het moet vrolijk en menselijk voelen, niet corporate en niet “AI-generated”.
- Gebruik de tokens, afstanden en componentregels uit `HUISSTIJL-HANDBOEK.md`.
- Neem niet klakkeloos stockfoto’s over in productie. Gebruik echte Lida-fotografie zodra die in de huidige site of assetbibliotheek beschikbaar is.
- Laat de klant de held zijn; Lida is de gids.
- De homepage moet binnen 5 seconden duidelijk maken: voor wie dit is, welk probleem wordt opgelost, welk resultaat de bezoeker krijgt en wat de volgende stap is.

## Werkwijze

1. Inspecteer eerst het bestaande project en documenteer framework, routes, CMS, formulieren, scripts en SEO-metadata.
2. Maak vóór wijzigingen een lijst van bestaande URL’s en content die behouden moet blijven.
3. Implementeer de design tokens centraal.
4. Bouw de homepage sectie voor sectie in exact deze volgorde:
   - header
   - hero
   - diensten
   - probleem/herkenning
   - 3 stappen
   - over Lida
   - reviews
   - blog/zelf ontdekken
   - nieuwsbrief
   - footer
5. Hergebruik bestaande echte tekst waar deze sterker of feitelijk nauwkeuriger is dan de demo-copy.
6. Koppel de CTA’s aan de bestaande advies- of contactroutes.
7. Test responsive op 1440, 1024, 768, 390 en 360 px.
8. Test toetsenbordnavigatie, contrast, alt-teksten, formulierlabels en focus states.
9. Optimaliseer alle afbeeldingen en voorkom layout shift.
10. Geef na afloop een changelog met gewijzigde bestanden en eventuele punten die nog echte content/foto’s nodig hebben.

## Niet doen

- Geen willekeurige gradients of glow-effecten toevoegen.
- Geen extra kaarten of badges toevoegen “om het mooier te maken”.
- Geen stockfoto als portret van Lida presenteren.
- Geen URL’s wijzigen zonder redirect.
- Geen bestaande blogposts verwijderen.
- Geen nieuwe afhankelijkheden installeren als native HTML/CSS of het bestaande framework voldoende is.
