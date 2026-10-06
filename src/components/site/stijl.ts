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
  "inline-flex min-h-11 items-center gap-1 text-[13px] font-extrabold underline-offset-4 hover:underline focus-visible:underline";

/** Zachte achtergrond per accentkleur (dienstenkaarten). */
export const KAART_ACHTERGROND = {
  coral: "bg-[#fff1ed]",
  sage: "bg-[#f1f7ee]",
  butter: "bg-[#fff8dd]",
} as const;

/** Rand bovenaan per accentkleur (stappen). */
export const KAART_RAND = {
  coral: "border-t-coral",
  sage: "border-t-sage",
  butter: "border-t-butter",
} as const;

/** Tekstkleur van de grote stapnummers (≥ 3:1 op wit, zie globals.css). */
export const KAART_NUMMER = {
  coral: "text-coral-tekst",
  sage: "text-sage-tekst",
  butter: "text-butter-tekst",
} as const;

/** Kleurvlak voor een lege fotoplek. */
export const KAART_VLAK = {
  coral: "bg-coral-soft",
  sage: "bg-sage",
  butter: "bg-butter",
} as const;
