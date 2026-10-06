import { Afbeelding } from "@/components/Afbeelding";

export interface LogoGegevens {
  url: string;
  alt: string;
  breedte: number | null;
  hoogte: number | null;
}

/**
 * Het typografische woordmerk (handboek §3, herziening oktober 2026): de naam in
 * DM Serif Display (gewone kast, zoals de koppen) met daaronder een kleine,
 * verfijnde regel in kapitalen met ruime spatiëring. Staat er een logo in
 * Beheer → Website → Instellingen, dan staat dat logo er in plaats van.
 */
export function Woordmerk({
  naam,
  subregel,
  logo,
}: {
  naam: string;
  subregel: string;
  logo?: LogoGegevens | null;
}) {
  if (logo) {
    return (
      <Afbeelding
        src={logo.url}
        alt={logo.alt}
        breedte={logo.breedte}
        hoogte={logo.hoogte}
        sizes="224px"
        prioriteit
        className="h-10 w-auto max-w-[14rem] object-contain"
      />
    );
  }
  return (
    <span className="inline-flex flex-col leading-none text-ink">
      <span className="font-serif text-[25px] leading-none font-normal tracking-[-0.005em] tablet:text-[28px]">{naam}</span>
      {subregel && (
        <span className="mt-[6px] text-[10px] leading-none font-semibold tracking-[0.2em] text-ink-soft uppercase">{subregel}</span>
      )}
    </span>
  );
}
