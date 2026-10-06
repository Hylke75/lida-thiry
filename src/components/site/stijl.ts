// Gedeelde klassen van de publieke site, één-op-één naar docs/ontwerp/styles.css.
// Breekpunten: basis = telefoon (≤ 640 px), tablet: = vanaf 641 px, desktop: = vanaf 981 px.

/** .container: max. 1180 px, 14 px marge op de telefoon en 20 px daarboven. */
export const CONTAINER = "mx-auto w-[min(calc(100%-28px),var(--container))] tablet:w-[min(calc(100%-40px),var(--container))]";

/** .section: 68 px boven/onder op de telefoon, 92 px daarboven. */
export const SECTIE = "py-[68px] tablet:py-[92px]";

/** Sectie met een anker: valt bij het springen niet onder de vaste kop. */
export const ANKER = "scroll-mt-24";

/** h1 (alleen de hero): 48 px op de telefoon, daarboven clamp(48px, 6.2vw, 83px). */
export const H1 =
  "mt-0 mb-[26px] font-serif text-[48px] leading-[1.02] font-normal tracking-[-0.025em] tablet:text-[clamp(48px,6.2vw,83px)]";

/** h2: 39 px op de telefoon, daarboven clamp(38px, 4.4vw, 58px). */
export const H2 =
  "mt-0 mb-5 font-serif text-[39px] leading-[1.02] font-normal tracking-[-0.02em] tablet:text-[clamp(38px,4.4vw,58px)]";

/** h3 (30 px, kaarten passen de grootte aan). */
export const H3 = "mt-0 font-serif leading-[1.02] font-normal";

/** Het accentwoord in een kop: cursief en koraal (donkerdere tint voor contrast). */
export const ACCENT = "font-normal text-coral-tekst italic";

/** .eyebrow */
export const BOVENSCHRIFT = "mt-0 mb-[14px] text-[12px] leading-[1.65] font-extrabold tracking-[0.13em] text-berry uppercase";

/** Kleine, vette link met pijl (kaarten): ruim genoeg om aan te tikken. */
export const KLEINE_LINK =
  "inline-flex min-h-11 items-center gap-1 text-[15px] font-bold underline-offset-4 hover:underline focus-visible:underline";

/**
 * Fotokader (herziening oktober 2026): rustige rechthoek met een kleine radius,
 * zonder rand. Zonder foto een effen warm-neutraal vlak (geen monogram, geen
 * patroon). De verhouding (staand 4:5 of 3:4) geeft de aanroeper mee, zodat er
 * niets verspringt.
 */
export const FOTOKADER = "rounded-[6px] bg-sand-deep";

/** Lopende tekst op de publieke site: 17 px op de telefoon, 18 px daarboven, zachte inkt (≥ 8:1). */
export const TEKST = "text-[17px] leading-[1.65] text-ink-soft tablet:text-[18px]";

/**
 * Typografisch citaat: DM Serif Display, groot, aubergine, recht, met een dunne
 * koraallijn ervoor. Geen kader.
 */
export const CITAAT =
  "m-0 border-l-2 border-coral pl-5 font-serif text-[26px] leading-[1.22] font-normal text-berry tablet:pl-6 tablet:text-[30px]";

// De kaartkleuren hieronder blijven bestaan voor bestaande aanroepen, maar zijn
// sinds de herziening (oktober 2026) neutraal: geen gekleurde vlakken meer.

/** Achtergrond van een kaart (neutraal, voor alle accentkleuren gelijk). */
export const KAART_ACHTERGROND = {
  coral: "bg-white",
  sage: "bg-white",
  butter: "bg-white",
} as const;

/** Rand bovenaan (stappen): één dunne koraallijn. */
export const KAART_RAND = {
  coral: "border-t-coral",
  sage: "border-t-coral",
  butter: "border-t-coral",
} as const;

/** Tekstkleur van de grote stapnummers (koraal, donkere tint: ≥ 3:1, alleen als grote tekst). */
export const KAART_NUMMER = {
  coral: "text-coral-tekst",
  sage: "text-coral-tekst",
  butter: "text-coral-tekst",
} as const;

/** Vlak van een lege fotoplek: effen warm-neutraal. */
export const KAART_VLAK = {
  coral: "bg-sand-deep",
  sage: "bg-sand-deep",
  butter: "bg-sand-deep",
} as const;
