import { datumPlusDagen, vandaagAmsterdam } from "@/lib/datum";
import type { ExportSoort } from "@/lib/verkoop/export";
import { invoer, kaart, knopSecundair, tekstUitleg } from "@/components/admin/stijl";

const LABEL: Record<ExportSoort, string> = {
  bestellingen: "Bestellingen",
  cadeaubonnen: "Cadeaubonnen",
  creditnotas: "Creditnota's",
};

/**
 * CSV-export voor de boekhouding over een periode (standaard: de vorige maand).
 * Een gewoon GET-formulier naar de exportroute, zodat de download direct start.
 */
export function ExportFormulier({ soorten }: { soorten: readonly ExportSoort[] }) {
  const vandaag = vandaagAmsterdam(new Date());
  const eersteVanMaand = `${vandaag.slice(0, 8)}01`;
  const tot = datumPlusDagen(eersteVanMaand, -1);
  const van = `${tot.slice(0, 8)}01`;
  return (
    <section className={kaart} aria-labelledby="export-kop">
      <h2 id="export-kop" className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
        Exporteren voor de boekhouding
      </h2>
      <form action="/admin/bestellingen/export" method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span>Wat</span>
          <select name="soort" defaultValue={soorten[0]} className={invoer}>
            {soorten.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span>Van</span>
          <input type="date" name="van" required defaultValue={van} className={invoer} />
        </label>
        <label className="flex flex-col gap-1">
          <span>Tot en met</span>
          <input type="date" name="tot" required defaultValue={tot} className={invoer} />
        </label>
        <button className={knopSecundair}>CSV downloaden</button>
      </form>
      <p className={tekstUitleg}>
        Op betaaldatum (creditnota&apos;s op datum van aanmaken), met btw-splitsing. Opent in Excel of Numbers (scheidingsteken
        puntkomma).
      </p>
    </section>
  );
}
