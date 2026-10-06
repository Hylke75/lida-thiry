import type { ComponentProps, ReactNode } from "react";
import { Bovenschrift, KopTekst, TekstLink } from "./Basis";

// Bouwstenen voor de pagina's van de klantroute (bestellen, test, cadeaubon,
// afspraak, review, mijn advies) in de vormgeving van docs/ontwerp: een rustige
// paginakop (bovenschrift + serif-kop), smalle formulierkolom, kaarten met een
// dunne lijn en rustige meldingen (herziening oktober 2026: warme neutrale
// tinten; een pastel hooguit spaarzaam als accent).

// Volledig uitgeschreven klassen (Tailwind leest alleen letterlijke klassen):
// gecentreerd, 14 px marge op de telefoon en 20 px daarboven.
const BREEDTE = {
  /** Formulieren en meldingen: max. 720 px. */
  smal: "mx-auto w-[min(calc(100%-28px),720px)] tablet:w-[min(calc(100%-40px),720px)]",
  /** De test (afbeelding naast velden): max. 860 px. */
  midden: "mx-auto w-[min(calc(100%-28px),860px)] tablet:w-[min(calc(100%-40px),860px)]",
  /** Volle containerbreedte: 1180 px. */
  breed: "mx-auto w-[min(calc(100%-28px),var(--container))] tablet:w-[min(calc(100%-40px),var(--container))]",
} as const;

export type KlantBreedte = keyof typeof BREEDTE;

/** De klassen van de kolom van een klantpagina. */
export function klantKolom(breedte: KlantBreedte = "smal"): string {
  return BREEDTE[breedte];
}

/**
 * <main> van een klantpagina: papierachtergrond, ruimte boven en onder (zoals
 * .section, iets compacter) en een gecentreerde kolom.
 */
export function KlantPagina({
  breedte = "smal",
  midden = false,
  className = "",
  children,
  ...rest
}: ComponentProps<"main"> & { breedte?: KlantBreedte; midden?: boolean }) {
  return (
    <main className={`flex flex-1 flex-col bg-paper py-14 tablet:py-[84px] ${midden ? "justify-center" : ""} ${className}`} {...rest}>
      <div className={`${klantKolom(breedte)} ${midden ? "text-center" : ""}`}>{children}</div>
    </main>
  );
}

/** De h1 van een klantpagina: serif, tussen h2 en de hero-h1 in. */
export const KLANT_H1 =
  "mt-0 mb-4 font-serif text-[39px] leading-[1.05] font-normal tracking-[-0.02em] text-ink tablet:text-[clamp(40px,4.6vw,56px)]";

/** Intro onder de kop (18–19 px, ink-soft). */
export const KLANT_INTRO = "text-[18px] leading-[1.6] text-ink-soft tablet:text-[19px]";

/**
 * Paginakop: optionele terug-link, bovenschrift, serif-kop (met *accentwoord*)
 * en een intro. `midden` centreert alles.
 */
export function KlantKop({
  bovenschrift,
  titel,
  terug,
  midden = false,
  className = "",
  children,
}: {
  bovenschrift?: string;
  titel: string;
  /** Link boven de kop, bijv. { href: "/", tekst: "← Terug" }. */
  terug?: { href: string; tekst: string };
  midden?: boolean;
  className?: string;
  /** Intro (tekst of opgemaakte inhoud). */
  children?: ReactNode;
}) {
  return (
    <header className={`mb-8 tablet:mb-10 ${midden ? "text-center" : ""} ${className}`}>
      {terug && (
        <TekstLink href={terug.href} className="mb-4 text-[14px] font-bold">
          {terug.tekst}
        </TekstLink>
      )}
      {bovenschrift && <Bovenschrift>{bovenschrift}</Bovenschrift>}
      <h1 className={KLANT_H1}>
        <KopTekst tekst={titel} />
      </h1>
      {children && (
        <div className={`${KLANT_INTRO} flex flex-col gap-3 [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_a]:underline-offset-[3px] [&_p]:m-0 ${midden ? "mx-auto max-w-[560px] items-center" : ""}`}>
          {children}
        </div>
      )}
    </header>
  );
}

// Herziening oktober 2026: één dunne lijn bovenaan, in koraal of aubergine (geen pastels).
const ACCENT_RAND = {
  coral: "border-t-coral",
  sage: "border-t-coral",
  butter: "border-t-coral",
  berry: "border-t-berry",
} as const;

export type KlantAccent = keyof typeof ACCENT_RAND;

/**
 * Kaart. Zonder accent: wit met een dunne warme lijn en 8 px radius (zoals de
 * dienstenkaarten). Met accent: daarbij een dunne (2 px) lijn bovenaan.
 */
export function KlantKaart({
  accent,
  className = "",
  children,
  ...rest
}: ComponentProps<"div"> & { accent?: KlantAccent }) {
  const vorm = accent
    ? `rounded-[8px] border border-line border-t-2 ${ACCENT_RAND[accent]} bg-white`
    : "rounded-[8px] border border-line bg-white";
  return (
    <div className={`${vorm} p-6 tablet:p-[34px] ${className}`} {...rest}>
      {children}
    </div>
  );
}

const MELDING = {
  /** Neutraal / ter info: cream met lijn. */
  info: "border-line bg-cream text-ink",
  /** Goed nieuws: wit met een dunne aubergine lijn links. */
  goed: "border-line border-l-berry border-l-2 bg-white text-ink",
  /** Let op: zand met een koraallijn links. */
  letop: "border-line border-l-coral border-l-2 bg-sand text-ink",
  /** Fout: zachte koraal met donkerrode tekst (7:1). */
  fout: "border-[#f3b8ad] bg-[#fff1ed] text-[#9f2a1c]",
} as const;

export type KlantMeldingSoort = keyof typeof MELDING;

/** Melding in een kader (14 px radius). Geef zelf role="alert"/"status" mee waar nodig. */
export function KlantMelding({
  soort = "info",
  className = "",
  children,
  ...rest
}: ComponentProps<"div"> & { soort?: KlantMeldingSoort }) {
  return (
    <div className={`rounded-[6px] border px-4 py-3 text-[16px] leading-[1.55] whitespace-pre-line ${MELDING[soort]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Klassen van KlantMelding, voor een eigen element (bijv. <p> of <li>). */
export function klantMeldingKlassen(soort: KlantMeldingSoort = "info"): string {
  return `rounded-[6px] border px-4 py-3 text-[16px] leading-[1.55] ${MELDING[soort]}`;
}

/** Lijst met dunne koraalkleurige vinkjes (zoals op de homepage). */
export function KlantVinklijst({ punten, className = "" }: { punten: readonly string[]; className?: string }) {
  const zichtbaar = punten.filter((p) => p.trim());
  if (!zichtbaar.length) return null;
  return (
    <ul className={`m-0 grid list-none gap-3 p-0 text-left ${className}`}>
      {zichtbaar.map((p, i) => (
        <li key={i} className="relative pl-[34px] text-[17px] leading-[1.55] font-medium text-ink">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="absolute top-[0.2em] left-0 h-[19px] w-[19px] text-coral-tekst"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
          {p}
        </li>
      ))}
    </ul>
  );
}
