// Formuliervelden in de stijl van het nieuwsbriefveld uit het ontwerp
// (.newsletter-form input): wit, dunne inktrand, berry rand + zachte ring bij focus.
// De dark:-varianten gelden alleen in het beheer (live voorbeelden), zie globals.css.

const BASIS =
  "w-full min-w-0 border bg-white text-[16px] text-ink outline-none placeholder:text-ink-soft transition-[border-color,box-shadow] duration-150 focus:border-berry focus:shadow-[0_0_0_3px_rgba(111,45,89,.18)] focus-visible:outline-none dark:bg-kaart dark:text-foreground";

const RAND_GOED = "border-[rgba(47,36,65,.28)] dark:border-white/20";
const RAND_FOUT = "border-[#b42318] focus:border-[#b42318] focus:shadow-[0_0_0_3px_rgba(180,35,24,.16)]";

/** Pil-veld (input, select): 54 px hoog, zoals het nieuwsbriefveld. */
export function veldKlassen(fout = false): string {
  return `${BASIS} min-h-[54px] rounded-full px-5 ${fout ? RAND_FOUT : RAND_GOED}`;
}

/** Tekstvak (textarea): zelfde rand en focus, met afgeronde hoeken in plaats van een pil. */
export function tekstvakKlassen(fout = false): string {
  return `${BASIS} rounded-ontwerp-sm px-5 py-4 leading-[1.6] ${fout ? RAND_FOUT : RAND_GOED}`;
}

/** Zichtbaar label boven een veld. */
export const LABEL = "text-[14px] font-bold text-ink dark:text-foreground";

/** Het sterretje van een verplicht veld. */
export const VERPLICHT = "text-berry dark:text-accent";

/** Foutmelding bij een veld (≥ 4,5:1 op wit). */
export const VELD_FOUT = "text-[14px] font-semibold text-[#b42318] dark:text-red-300";

/** Algemene foutmelding boven de knop. */
export const MELDING_FOUT =
  "m-0 rounded-ontwerp-sm border border-[#f3c3bd] bg-[#fff4f2] px-4 py-3 text-[14px] text-[#9b1c13] dark:border-red-900 dark:bg-red-950/40 dark:text-red-300";

/** Bevestiging na versturen. */
export const MELDING_GOED =
  "m-0 rounded-ontwerp-sm border border-line bg-[#f1f7ee] px-5 py-4 text-ink dark:border-white/15 dark:bg-kaart dark:text-foreground";

/** Kleine lettertjes onder een formulier (toestemming, privacy). */
export const KLEINE_LETTERS =
  "text-[12px] leading-[1.55] text-ink-soft dark:text-foreground/75 [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_a]:underline-offset-[3px] dark:[&_a]:text-accent [&_p]:m-0";
