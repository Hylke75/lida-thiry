// Gedeelde klassen voor formulieren op de klantroute (bestellen, test, cadeaubon,
// afspraak, review, mijn advies), in de stijl van het nieuwsbriefveld uit
// docs/ontwerp/styles.css: witte achtergrond, dunne inktrand, berry bij focus.
// Alleen licht (de publieke site heeft geen donkere modus).

/** Tekstveld (input/select): min. 52 px hoog, 16 px tekst (geen zoom op iOS). */
export const INVOER =
  "min-h-[52px] w-full rounded-ontwerp-sm border border-[rgba(47,36,65,.24)] bg-white px-4 py-3 text-[16px] leading-[1.4] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-soft focus:border-berry focus:shadow-[0_0_0_3px_rgba(111,45,89,.14)] focus-visible:outline-none";

/** Tekstveld met een fout: donkerrode rand (≥ 3:1 op wit). */
export const INVOER_FOUT =
  "min-h-[52px] w-full rounded-ontwerp-sm border border-[#b42318] bg-white px-4 py-3 text-[16px] leading-[1.4] text-ink outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ink-soft focus:border-[#b42318] focus:shadow-[0_0_0_3px_rgba(180,35,24,.16)] focus-visible:outline-none";

/** Kies INVOER of INVOER_FOUT. */
export const invoer = (fout: boolean) => (fout ? INVOER_FOUT : INVOER);

/** Label boven een veld. */
export const LABEL = "text-[15px] font-bold text-ink";

/** Het sterretje achter een verplicht label. */
export const VERPLICHT = "text-berry";

/** Uitleg bij een veld (ink-soft: 9,7:1 op wit). */
export const HULPTEKST = "text-[15px] leading-[1.5] text-ink-soft";

/** Foutmelding onder een veld (#b42318: 6,5:1 op wit). */
export const VELDFOUT = "text-[14px] font-semibold text-[#b42318]";

/** Kop van een fieldset. */
export const LEGENDA = "mb-3 text-[14px] font-extrabold tracking-[0.1em] text-ink uppercase";

/** Vinkje of keuzerondje (native), met de berry-kleur. */
export const VINKJE = "mt-[3px] h-5 w-5 shrink-0 cursor-pointer accent-berry";

/** Label om een vinkje heen: tekst naast het vakje, ruim aan te tikken. */
export const VINKJE_LABEL = "flex min-h-11 cursor-pointer items-start gap-3 text-[16px] leading-[1.55] text-ink";

/**
 * Keuzetegel (radio verborgen met sr-only, het label is de tegel): rand in inkt,
 * gekozen = berry-rand met een zandkleurige achtergrond. Focus via has-[:focus-visible].
 */
export const keuzeTegel = (gekozen: boolean) =>
  `cursor-pointer border-2 text-ink transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-[3px] has-[:focus-visible]:outline-berry ${
    gekozen ? "border-berry bg-sand" : "border-[rgba(47,36,65,.24)] bg-white hover:border-[rgba(111,45,89,.5)]"
  }`;

/** Links in lopende tekst binnen een formulier of melding. */
export const TEKST_LINK = "font-bold text-berry underline decoration-1 underline-offset-[3px] hover:text-ink";
