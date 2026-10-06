import type { ComponentProps, ReactNode } from "react";
import { Bovenschrift, KopTekst, TekstLink } from "./Basis";

// Bouwstenen voor de pagina's van de klantroute (bestellen, test, cadeaubon,
// afspraak, review, mijn advies) in de vormgeving van docs/ontwerp: een rustige
// paginakop (bovenschrift + serif-kop), smalle formulierkolom, kaarten met een
// dunne lijn en meldingen in de accentkleuren (per component één sterke kleur).

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

/** Intro onder de kop (18 px, ink-soft). */
export const KLANT_INTRO = "text-[18px] leading-[1.6] text-ink-soft";

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

const ACCENT_RAND = {
  coral: "border-t-coral",
  sage: "border-t-sage",
  butter: "border-t-butter",
  berry: "border-t-berry",
} as const;

export type KlantAccent = keyof typeof ACCENT_RAND;

/**
 * Kaart. Zonder accent: wit met een dunne lijn en 20 px radius (zoals de
 * dienstenkaarten). Met accent: wit met een 5 px gekleurde rand bovenaan en een
 * zachte schaduw (zoals de stappenkaarten).
 */
export function KlantKaart({
  accent,
  className = "",
  children,
  ...rest
}: ComponentProps<"div"> & { accent?: KlantAccent }) {
  const vorm = accent
    ? `border-t-[5px] ${ACCENT_RAND[accent]} bg-white shadow-[0_14px_40px_rgba(58,40,52,.06)]`
    : "rounded-ontwerp-md border border-line bg-white";
  return (
    <div className={`${vorm} p-6 tablet:p-[34px] ${className}`} {...rest}>
      {children}
    </div>
  );
}

const MELDING = {
  /** Neutraal / ter info: cream met lijn. */
  info: "border-line bg-cream text-ink",
  /** Goed nieuws: zachte salie. */
  goed: "border-sage bg-[#f1f7ee] text-ink",
  /** Let op: zachte boter. */
  letop: "border-butter bg-[#fff8dd] text-ink",
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
    <div className={`rounded-ontwerp-sm border px-4 py-3 text-[15px] leading-[1.55] whitespace-pre-line ${MELDING[soort]} ${className}`} {...rest}>
      {children}
    </div>
  );
}

/** Klassen van KlantMelding, voor een eigen element (bijv. <p> of <li>). */
export function klantMeldingKlassen(soort: KlantMeldingSoort = "info"): string {
  return `rounded-ontwerp-sm border px-4 py-3 text-[15px] leading-[1.55] ${MELDING[soort]}`;
}

/** Lijst met ronde koraalkleurige vinkjes (.check-list uit het ontwerp). */
export function KlantVinklijst({ punten, className = "" }: { punten: readonly string[]; className?: string }) {
  const zichtbaar = punten.filter((p) => p.trim());
  if (!zichtbaar.length) return null;
  return (
    <ul className={`m-0 grid list-none gap-3 p-0 text-left ${className}`}>
      {zichtbaar.map((p, i) => (
        <li key={i} className="relative pl-[38px] font-[650] text-ink">
          <span aria-hidden="true" className="absolute top-px left-0 grid h-[25px] w-[25px] place-items-center rounded-full bg-coral text-white">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          </span>
          {p}
        </li>
      ))}
    </ul>
  );
}
