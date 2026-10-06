import { Afbeelding } from "@/components/Afbeelding";

export interface LogoGegevens {
  url: string;
  alt: string;
  breedte: number | null;
  hoogte: number | null;
}

/**
 * Het typografische woordmerk (handboek §3): de naam vet in kapitalen met
 * daaronder een kleine regel met ruime spatiëring, in aubergine. Staat er een
 * logo in Beheer → Website → Instellingen, dan staat dat logo er in plaats van.
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
      <span className="text-[18px] font-bold tracking-[0.045em] uppercase tablet:text-[20px]">{naam}</span>
      {subregel && <span className="mt-[5px] text-[8px] font-bold tracking-[0.22em] text-ink-soft uppercase">{subregel}</span>}
    </span>
  );
}
