// Startsjablonen voor automatische mails. Puur: de eigenaar past de tekst daarna
// zelf aan in het beheer.

import type { Blok } from "./blokken";

export type Trigger = "aanmelding" | "advies";

export const TRIGGER_LABEL: Record<Trigger, string> = {
  aanmelding: "Na het bevestigen van de aanmelding",
  advies: "Nadat een klant haar advies heeft ontvangen",
};

export const TRIGGERS = Object.keys(TRIGGER_LABEL) as Trigger[];

export interface Sjabloon {
  sleutel: string;
  titel: string;
  uitleg: string;
  naam: string;
  onderwerp: string;
  preheader: string;
  trigger: Trigger;
  vertraging_dagen: number;
  blokken: (site: string) => Blok[];
}

export const SJABLONEN: Sjabloon[] = [
  {
    sleutel: "welkom",
    titel: "Welkomstmail",
    uitleg: "Direct nadat iemand de aanmelding voor de nieuwsbrief heeft bevestigd.",
    naam: "Welkomstmail",
    onderwerp: "Welkom, {voornaam}!",
    preheader: "Fijn dat je erbij bent. Dit kun je van mij verwachten.",
    trigger: "aanmelding",
    vertraging_dagen: 0,
    blokken: (site) => [
      { id: "kop", soort: "kop", tekst: "Welkom, {voornaam}!" },
      {
        id: "intro",
        soort: "tekst",
        tekst:
          "Wat leuk dat je je hebt aangemeld voor mijn nieuwsbrief. Een paar keer per jaar deel ik praktische tips over kleding die bij jóuw figuur past, nieuwe inspiratie en af en toe een aanbieding.\n\nIn de nieuwsbrief vind je onder andere:\n\n- tips om je figuur mooi in balans te brengen\n- welke kleuren en vormen je flatteren\n- nieuws en aanbiedingen",
      },
      {
        id: "advies",
        soort: "tekst",
        tekst: "Benieuwd welk figuurtype jij hebt? Met de online test krijg je een persoonlijk kledingadvies, helemaal afgestemd op jouw maten.",
      },
      { id: "knop", soort: "knop", tekst: "Ontdek jouw figuurtype", url: site },
      { id: "groet", soort: "tekst", tekst: "Hartelijke groet,\n\n**Lida Thiry**" },
    ],
  },
  {
    sleutel: "advies",
    titel: "Tips na je advies",
    uitleg: "Een week nadat een klant haar persoonlijke advies heeft ontvangen.",
    naam: "Tips na je advies",
    onderwerp: "{voornaam}, zo haal je het meeste uit je advies",
    preheader: "Drie tips om direct mee aan de slag te gaan.",
    trigger: "advies",
    vertraging_dagen: 7,
    blokken: (site) => [
      { id: "kop", soort: "kop", tekst: "Hoe bevalt je advies, {voornaam}?" },
      {
        id: "intro",
        soort: "tekst",
        tekst:
          "Een week geleden ontving je jouw persoonlijke kledingadvies. Misschien heb je al wat uitgeprobeerd? Hier zijn drie tips om er het meeste uit te halen.",
      },
      {
        id: "tips",
        soort: "tekst",
        tekst:
          "## Drie tips\n\n- **Begin bij je kast.** Leg de kledingstukken die volgens je advies goed bij je passen bij elkaar en kijk welke combinaties je kunt maken.\n- **Neem je advies mee.** Bewaar het op je telefoon, zodat je het in de winkel bij de hand hebt.\n- **Eén stuk tegelijk.** Vervang niet alles in één keer, maar kies bij elke nieuwe aankoop bewust.",
      },
      { id: "lijn", soort: "scheiding" },
      {
        id: "vraag",
        soort: "tekst",
        tekst: "Heb je een vraag over je advies? Beantwoord gerust deze mail, ik help je graag verder.",
      },
      { id: "knop", soort: "knop", tekst: "Naar de website", url: site },
      { id: "groet", soort: "tekst", tekst: "Hartelijke groet,\n\n**Lida Thiry**" },
    ],
  },
];

export function vindSjabloon(sleutel: unknown): Sjabloon | undefined {
  return SJABLONEN.find((s) => s.sleutel === sleutel);
}

/** Vertraging in hele dagen, 0 tot en met 365. */
export function normaliseerVertraging(v: unknown): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(365, Math.max(0, n)) : 0;
}

/** Korte omschrijving van wanneer een automatische mail verstuurd wordt. */
export function beschrijfMoment(trigger: Trigger | null, dagen: number): string {
  const wanneer = dagen === 0 ? "Direct" : dagen === 1 ? "1 dag" : `${dagen} dagen`;
  if (trigger === "aanmelding") return dagen === 0 ? "Direct na het bevestigen van de aanmelding" : `${wanneer} na het bevestigen van de aanmelding`;
  if (trigger === "advies") return dagen === 0 ? "Direct nadat het advies is verstuurd" : `${wanneer} nadat het advies is verstuurd`;
  return "Geen moment gekozen";
}
