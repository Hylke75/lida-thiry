import { Lichaam } from "@/components/Lichaam";
import type { Lichaamsvorm } from "@/lib/test-config";

// Het silhouet van een figuurtype in een rustig kader (herziening oktober 2026:
// geen organische vormen meer, warme neutrale tinten). Gebruikt in de
// silhouetkeuze, de uitslag en op "Jouw figuurtype" (alleen achter de testlink).

/**
 * Vlak achter de figuur. Koraal (zacht) is het ene accent: het eigen of gekozen
 * type. De andere namen blijven voor bestaande aanroepen, maar zijn allemaal
 * effen zand (geen pastelregenboog).
 */
export const VLAK_KLEUREN = {
  coral: "bg-coral-soft",
  sage: "bg-sand",
  butter: "bg-sand",
  sky: "bg-sand",
  lilac: "bg-sand",
  mint: "bg-sand",
} as const;

export type VlakKleur = keyof typeof VLAK_KLEUREN;

const VOLGORDE: readonly VlakKleur[] = ["coral", "sage", "butter", "sky", "lilac"];

/** De vlakkleur voor het i-de figuurtype (koraal, salie, boter, lucht, lila, …). */
export function vlakKleur(i: number): VlakKleur {
  return VOLGORDE[((i % VOLGORDE.length) + VOLGORDE.length) % VOLGORDE.length];
}

/** Rustig kader met een kleine radius; de twee varianten blijven voor bestaande aanroepen. */
const VORMEN = ["rounded-[8px]", "rounded-[8px]"] as const;

export function SilhouetVlak({
  silhouet,
  titel,
  kleur = "coral",
  variant = 0,
  className = "",
  figuurKlasse = "h-56",
  onthul = false,
  schaduw = false,
}: {
  silhouet: { vorm: Lichaamsvorm; beeldUrl?: string | null };
  /** Beschrijving voor schermlezers (leeg = decoratief). */
  titel: string;
  kleur?: VlakKleur;
  variant?: 0 | 1;
  /** Klassen voor het vlak (maat, padding). */
  className?: string;
  /** Hoogte van de tekening of foto. */
  figuurKlasse?: string;
  /** Met onthul-animatie (alleen zonder prefers-reduced-motion, zie globals.css). */
  onthul?: boolean;
  schaduw?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-center [--lichaam-vulling:var(--white)] ${VLAK_KLEUREN[kleur]} ${VORMEN[variant]} ${
        schaduw ? "shadow-[0_12px_32px_rgba(47,36,65,.06)]" : ""
      } ${onthul ? "onthul-vlak" : ""} ${className}`}
    >
      {silhouet.beeldUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tijdelijke (signed) URL uit de beeldbank
        <img
          src={silhouet.beeldUrl}
          alt={titel}
          className={`w-auto object-contain ${figuurKlasse} ${onthul ? "onthul-figuur" : ""}`}
        />
      ) : (
        <Lichaam vorm={silhouet.vorm} armen={false} titel={titel} className={`w-auto ${figuurKlasse} ${onthul ? "onthul-figuur" : ""}`} />
      )}
    </div>
  );
}
