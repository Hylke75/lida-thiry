import Link from "next/link";
import type { ReactNode } from "react";
import { knop, knopSecundair, tekstZacht } from "../stijl";
import { Draaier } from "./onderdelen";

/** Vaste balk bovenaan de editor met status, geschiedenis, voorbeeld/bekijken en opslaan. */
export function OpslaanBalk({
  status,
  gewijzigd,
  bezig,
  geschiedenis,
  bekijkHref,
  voorbeeldHref,
  onOpslaan,
}: {
  /** Badges en dergelijke vóór de opslagstatus. */
  status: ReactNode;
  gewijzigd: boolean;
  bezig: string | null;
  geschiedenis: ReactNode;
  /** Openbaar adres; alleen gezet als het online staat en er niets gewijzigd is. */
  bekijkHref: string | null;
  voorbeeldHref: string;
  onOpslaan: () => void;
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 dark:border-white/15">
      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
        {status}
        <span className={gewijzigd ? "font-medium text-amber-700 dark:text-amber-300" : tekstZacht}>{gewijzigd ? "● Niet opgeslagen" : "Alles opgeslagen"}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {geschiedenis}
        {bekijkHref ? (
          <a href={bekijkHref} target="_blank" rel="noopener noreferrer" className={knopSecundair}>
            Bekijken ↗
          </a>
        ) : (
          <Link href={voorbeeldHref} className={knopSecundair} title={gewijzigd ? "Het voorbeeld toont de laatst opgeslagen versie" : undefined}>
            Voorbeeld
          </Link>
        )}
        <button type="button" onClick={onOpslaan} disabled={Boolean(bezig) || !gewijzigd} className={knop} title="Opslaan (Ctrl+S of ⌘S)">
          {bezig === "opslaan" ? (
            <>
              <Draaier /> Opslaan…
            </>
          ) : (
            "Opslaan"
          )}
        </button>
      </div>
    </div>
  );
}
