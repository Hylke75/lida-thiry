/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */
import Link from "next/link";
import { ActieFormulier } from "../ActieFormulier";
import { verplaatsBeeld, verwijderBeeld } from "../acties";
import { knopKlein } from "@/components/admin/stijl";
import { Verborgen } from "./onderdelen";
import type { SectieBeeld } from "./regels";

/** Eén beeld in een sectie: voorbeeld, code/naam/bijschrift, verplaatsen, uit de sectie halen en naar de beeldbank. */
export function BeeldTegel({
  beeld: b,
  sleutel,
  sectieId,
  sectieKop,
  eerste,
  laatste,
}: {
  beeld: SectieBeeld;
  sleutel: string;
  sectieId: string;
  sectieKop: string;
  eerste: boolean;
  laatste: boolean;
}) {
  const waarden = {
    sleutel,
    sectie_id: sectieId,
    volgorde: b.volgorde,
    beeld_id: b.beeld_id,
  };
  return (
    <div className="flex w-40 flex-col gap-1.5 rounded-xl border border-black/10 bg-background p-2 dark:border-white/15">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
        {b.url ? (
          <img
            src={b.url}
            alt={b.naam ?? b.code}
            loading="lazy"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <span className="text-xs text-black/40">
            geen voorbeeld
          </span>
        )}
      </div>
      <p className="text-xs">
        <span className="font-medium">{b.code}</span>
        {b.naam && (
          <span className="block break-all text-foreground/70">
            {b.naam}
          </span>
        )}
      </p>
      {b.bijschrift && (
        <p
          className="line-clamp-2 text-xs italic text-foreground/70"
          title={b.bijschrift}
        >
          &ldquo;{b.bijschrift}&rdquo;
        </p>
      )}
      <div className="mt-auto flex items-center gap-1">
        <ActieFormulier actie={verplaatsBeeld} stil>
          <Verborgen
            waarden={{ ...waarden, richting: "links" }}
          />
          <button
            className={knopKlein}
            disabled={eerste}
            aria-label="Naar links"
            title="Naar links"
          >
            ←
          </button>
        </ActieFormulier>
        <ActieFormulier actie={verplaatsBeeld} stil>
          <Verborgen
            waarden={{ ...waarden, richting: "rechts" }}
          />
          <button
            className={knopKlein}
            disabled={laatste}
            aria-label="Naar rechts"
            title="Naar rechts"
          >
            →
          </button>
        </ActieFormulier>
        <ActieFormulier
          actie={verwijderBeeld}
          stil
          bevestig={`Beeld ${b.code} uit de sectie '${sectieKop}' halen?\n\nHet beeld blijft in de beeldbank staan en in andere hand-outs.`}
        >
          <Verborgen waarden={waarden} />
          <button
            className={`${knopKlein} hover:!border-red-600 hover:!text-red-700`}
          >
            Uit sectie halen
          </button>
        </ActieFormulier>
      </div>
      <Link
        href={`/admin/beeldbank/${b.beeld_id}`}
        className="text-xs text-accent underline-offset-4 hover:underline"
      >
        Bewerken/vervangen in beeldbank
      </Link>
    </div>
  );
}
