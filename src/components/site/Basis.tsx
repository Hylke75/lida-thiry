import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { splitsAccent } from "@/lib/website/weergave";
import { ACCENT, BOVENSCHRIFT, CONTAINER, H2 } from "./stijl";

// Kleine bouwstenen van de publieke site (docs/ontwerp): container, knoppen,
// tekstlink, bovenschrift, sectiekop en het kleurlint.

/** .container: gecentreerd, max. 1180 px. */
export function Container({ className = "", children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={`${CONTAINER} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export type KnopVariant = "primair" | "outline";

/**
 * Klassen van de pil-knop (.button), ook voor een <button> (bijv. in een formulier).
 * Primair: berry met witte tekst; outline: transparant met berry-rand. `klein` = .button-small.
 */
export function knopKlassen({ variant = "primair", klein = false }: { variant?: KnopVariant; klein?: boolean } = {}): string {
  return [
    "inline-flex items-center justify-center gap-[10px] rounded-full border border-berry text-[14px] leading-[1.65] font-bold",
    "transition-[transform,box-shadow,background-color,color] duration-[180ms] ease-[ease]",
    "motion-safe:hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(111,45,89,.16)]",
    "focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-berry",
    "disabled:pointer-events-none disabled:opacity-60",
    klein ? "min-h-11 px-[18px]" : "min-h-[52px] px-[22px]",
    variant === "outline" ? "bg-transparent text-berry hover:bg-berry hover:text-white" : "bg-berry text-white",
  ].join(" ");
}

/** De pijl achter knop- en linkteksten (alleen decoratie). */
export function Pijl() {
  return <span aria-hidden="true">→</span>;
}

/** Pil-knop als link. Met `pijl` komt er "→" achter de tekst. */
export function Knop({
  href,
  variant = "primair",
  klein = false,
  pijl = true,
  className = "",
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  variant?: KnopVariant;
  klein?: boolean;
  pijl?: boolean;
}) {
  return (
    <Link href={href} className={`${knopKlassen({ variant, klein })} ${className}`} {...rest}>
      {children}
      {pijl && <Pijl />}
    </Link>
  );
}

/** .text-link: vet met een dunne onderstreping. */
export function TekstLink({
  href,
  pijl = false,
  className = "",
  children,
  ...rest
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string; pijl?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center gap-1.5 font-bold underline decoration-1 underline-offset-[5px] hover:text-berry ${className}`}
      {...rest}
    >
      {children}
      {pijl && <Pijl />}
    </Link>
  );
}

/** .eyebrow: klein label in kapitalen boven een kop. */
export function Bovenschrift({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`${BOVENSCHRIFT} ${className}`}>{children}</p>;
}

/** Koptekst met het accentwoord (*woord*) cursief in koraal. */
export function KopTekst({ tekst }: { tekst: string }) {
  return (
    <>
      {splitsAccent(tekst).map((d, i) =>
        d.accent ? (
          <em key={i} className={ACCENT}>
            {d.tekst}
          </em>
        ) : (
          d.tekst
        ),
      )}
    </>
  );
}

/**
 * Sectiekop (.section-heading). "rij": bovenschrift + h2 links en iets (intro of
 * link) rechts, op smalle schermen onder elkaar. "midden": gecentreerd, met
 * `smal` op max. 800 px.
 */
export function SectieKop({
  bovenschrift,
  titel,
  id,
  variant = "rij",
  smal = false,
  rechts,
}: {
  bovenschrift?: string;
  titel: string;
  /** id van de h2 (voor aria-labelledby op de sectie). */
  id?: string;
  variant?: "rij" | "midden";
  smal?: boolean;
  /** Alleen bij "rij": intro of link rechts naast de kop. */
  rechts?: ReactNode;
}) {
  const kop = (
    <>
      {bovenschrift && <Bovenschrift>{bovenschrift}</Bovenschrift>}
      <h2 id={id} className={H2}>
        <KopTekst tekst={titel} />
      </h2>
    </>
  );
  if (variant === "midden") {
    return <div className={`mb-[42px] text-center ${smal ? "mx-auto max-w-[800px]" : ""}`}>{kop}</div>;
  }
  return (
    <div className="mb-10 flex flex-col items-start gap-[14px] desktop:flex-row desktop:items-end desktop:justify-between desktop:gap-10">
      <div className="max-w-[680px]">{kop}</div>
      {rechts}
    </div>
  );
}

/** .section-intro: de korte intro rechts naast een sectiekop. */
export function SectieIntro({ children }: { children: ReactNode }) {
  return <p className="mt-0 mb-[10px] max-w-[440px] text-ink-soft">{children}</p>;
}

/** .color-ribbon: smalle strook met de vijf accentkleuren (decoratie). */
export function KleurLint({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`grid h-[11px] grid-cols-5 ${className}`}>
      <span className="bg-coral" />
      <span className="bg-butter" />
      <span className="bg-sage" />
      <span className="bg-sky" />
      <span className="bg-lilac" />
    </div>
  );
}
