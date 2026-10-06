// Gedeelde Tailwind-klassen voor het beheer (src/app/admin/**).
//
// Gewone constanten: bruikbaar in server- én clientcomponenten. Gebruik deze in plaats van per pagina
// eigen klassen te definiëren, zodat alle beheerpagina's er hetzelfde uitzien.
//
// Kleuren: tekst gebruikt waar het kan de thematokens uit globals.css (`foreground`, `accent`, `kaart`),
// die licht/donker zelf regelen. Randen houden een vast zwart/wit-paar, omdat de donkere modus daar
// net wat meer dekking nodig heeft dan de lichte (black/10 ↔ white/15 voor kaarten en scheidingslijnen,
// black/15 ↔ white/20 voor invoervelden en knoppen).
//
// Contrast (WCAG AA, ≥ 4,5:1 voor gewone tekst), berekend tegen --background en --kaart:
// - tekstZacht (foreground/70): licht ≈ 5,2:1, donker ≈ 8:1.
// - knop (tekst in --background op --accent): licht ≈ 5,3:1, donker ≈ 7,7:1.
// - tekstFout/tekstSucces (red/emerald-700 ↔ -300): licht ≥ 5:1, donker ≥ 9:1.
// - toon.* (x-800 op x-50 ↔ x-300 op x-950/40): ruim boven 4,5:1.

/** Secundaire tekst: uitleg, metadata, hulpteksten. */
export const tekstZacht = "text-foreground/70";
/** Foutmelding als losse tekst. */
export const tekstFout = "text-red-700 dark:text-red-300";
/** Succesmelding als losse tekst. */
export const tekstSucces = "text-emerald-700 dark:text-emerald-300";

/** Invoerveld, select of textarea. Breedte bepaalt de plek waar het staat; zie ook `invoerBreed`. */
export const invoer =
  "min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent disabled:opacity-60 aria-[invalid=true]:border-red-400 dark:border-white/20";
/** Invoerveld over de volle breedte van zijn container. */
export const invoerBreed = `${invoer} w-full`;
/** Hulptekst onder of in een veldlabel. */
export const tekstUitleg = "text-xs font-normal leading-relaxed text-foreground/70";
/** Label dat een veld omsluit (tekst boven het veld). */
export const label = "flex flex-col gap-1 text-sm font-medium";

/** Hoofdknop (accentkleur). */
export const knop =
  "rounded-full bg-accent px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50";
/** Tweede knop naast een hoofdknop: omrand, zonder vulling. */
export const knopSecundair =
  "rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";
/** Kleine omrande knop, voor acties in lijsten en rijen. */
export const knopKlein =
  "rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";
/** Verwijderen en andere onomkeerbare acties. */
export const knopGevaar =
  "rounded-full border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40";
/** Kleine variant van `knopGevaar`, naast `knopKlein`. */
export const knopGevaarKlein =
  "rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40";

/** Alleen het vlak van een kaart (rand, achtergrond, afronding, binnenruimte), zonder indeling. */
export const kaartVlak = "min-w-0 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15";
/** Kaart: omrand vlak voor een samenhangend blok op een pagina; inhoud onder elkaar. */
export const kaart = `flex flex-col gap-3 ${kaartVlak}`;

/** Label/badge (status, soort); combineer met een kleur uit `toon`. */
export const badge = "inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs";

/** Achtergrond- en tekstkleur voor badges en meldingen. */
export const toon = {
  grijs: "bg-black/5 text-foreground/70 dark:bg-white/10",
  groen: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  blauw: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  amber: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  rood: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  accent: "bg-accent-zacht text-accent",
} as const;

export type Toon = keyof typeof toon;
