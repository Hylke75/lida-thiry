import type { ReactNode } from "react";
import { Afbeelding } from "@/components/Afbeelding";
import { isGeldigAfbeeldingAdres } from "@/lib/inhoud/schema";

/**
 * Een fotoplek met vaste vorm: de foto (object-fit: cover, via next/image als
 * het adres uit de eigen opslag komt) of, zonder foto, een rustig kleurvlak met
 * een fijn stippenpatroon. Geen nepfoto. De ouder bepaalt de maat en de vorm
 * (verhouding, masker); deze component vult die helemaal, dus er verspringt niets.
 */
export function BeeldPlek({
  src,
  alt,
  sizes,
  prioriteit = false,
  vlak = "bg-peach",
  className = "",
  beeldKlasse = "",
  children,
}: {
  src: string | null | undefined;
  /** Beschrijving; leeg = decoratief. */
  alt: string;
  /** Hoe breed de foto op het scherm staat (next/image `sizes`). */
  sizes: string;
  prioriteit?: boolean;
  /** Kleur van het lege vlak (Tailwind-klasse). */
  vlak?: string;
  /** Klassen voor het kader (positie, maat, vorm). */
  className?: string;
  /** Extra klassen voor de foto (bijv. een hover-zoom). */
  beeldKlasse?: string;
  /** Iets in het lege vlak, bijv. initialen. */
  children?: ReactNode;
}) {
  const adres = src?.trim();
  if (adres && isGeldigAfbeeldingAdres(adres)) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <Afbeelding vullen src={adres} alt={alt} sizes={sizes} prioriteit={prioriteit} className={`object-cover ${beeldKlasse}`} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" className={`relative overflow-hidden ${vlak} ${className}`}>
      {/* Fijn stippenpatroon in inkt (zie .stippen in globals.css). */}
      <div className="stippen absolute inset-0" />
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}
