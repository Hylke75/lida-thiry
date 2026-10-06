import { Lichaam } from "@/components/Lichaam";
import type { Lichaamsvorm } from "@/lib/test-config";

// Het silhouet van een figuurtype in een organisch gevormd kleurvlak (zoals de
// foto bij "Herken je dit?" in docs/ontwerp: .problem-image). Gebruikt in de
// silhouetkeuze, de uitslag en op "Jouw figuurtype" (alleen achter de testlink).

/** Zachte tinten van de accentkleuren, voor het vlak achter de figuur. */
export const VLAK_KLEUREN = {
  coral: "bg-coral-soft",
  sage: "bg-[#e3efdd]",
  butter: "bg-[#fcefc2]",
  sky: "bg-[#e1eef8]",
  lilac: "bg-[#f3e1ec]",
  mint: "bg-[#e0f1ee]",
} as const;

export type VlakKleur = keyof typeof VLAK_KLEUREN;

const VOLGORDE: readonly VlakKleur[] = ["coral", "sage", "butter", "sky", "lilac"];

/** De vlakkleur voor het i-de figuurtype (koraal, salie, boter, lucht, lila, …). */
export function vlakKleur(i: number): VlakKleur {
  return VOLGORDE[((i % VOLGORDE.length) + VOLGORDE.length) % VOLGORDE.length];
}

/** Organische vorm (handboek: .problem-image), in twee spiegelvarianten. */
const VORMEN = [
  "rounded-[46%_54%_46%_54%/52%_42%_58%_48%]",
  "rounded-[54%_46%_52%_48%/44%_56%_44%_56%]",
] as const;

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
        schaduw ? "shadow-ontwerp" : ""
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
