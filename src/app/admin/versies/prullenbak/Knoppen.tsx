"use client";

import { herstelUitPrullenbak, wisUitPrullenbak } from "../acties";

const knopKlein =
  "rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-30 dark:border-white/20 dark:hover:bg-white/5";

/** "Herstellen" en "Definitief wissen" voor één verwijderde pagina of één verwijderd bericht. */
export function PrullenbakKnoppen({ versieId, soort, refId, titel }: { versieId: string; soort: "pagina" | "blog"; refId: string; titel: string }) {
  const wat = soort === "pagina" ? "pagina" : "bericht";
  return (
    <div className="flex flex-wrap gap-2">
      <form
        action={herstelUitPrullenbak}
        onSubmit={(e) => {
          if (!confirm(`"${titel}" herstellen? Het ${wat === "pagina" ? "wordt een conceptpagina" : "wordt een conceptbericht"}; je kunt het daarna weer publiceren.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="versie" value={versieId} />
        <button className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:opacity-90">Herstellen</button>
      </form>
      <form
        action={wisUitPrullenbak}
        onSubmit={(e) => {
          if (!confirm(`De geschiedenis van "${titel}" definitief wissen? Daarna kan deze ${wat} niet meer worden hersteld.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="soort" value={soort} />
        <input type="hidden" name="ref" value={refId} />
        <button className={`${knopKlein} text-red-700 dark:text-red-300`}>Definitief wissen</button>
      </form>
    </div>
  );
}
