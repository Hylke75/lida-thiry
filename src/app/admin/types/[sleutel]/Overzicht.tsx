import { ActieFormulier } from "../ActieFormulier";
import { slaTypeOp } from "../acties";
import { invoerBreed, kaart, knop } from "@/components/admin/stijl";
import { OpmaakUitleg, Verborgen } from "./onderdelen";
import type { Sectie, Type, Veld } from "./regels";

/** Kaart "Gegevens": titel en de labels voor lengte en maat. */
export function GegevensKaart({ type }: { type: Type }) {
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Gegevens</h2>
      <ActieFormulier
        actie={slaTypeOp}
        bewaakWijzigingen
        className="grid gap-3 sm:grid-cols-2"
      >
        <Verborgen waarden={{ sleutel: type.sleutel }} />
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Titel
          <input
            name="titel"
            required
            defaultValue={type.titel}
            className={`${invoerBreed} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Lengte (label)
          <input
            name="lengte_label"
            defaultValue={type.lengte_label ?? ""}
            className={`${invoerBreed} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Maat (label)
          <input
            name="maat_label"
            defaultValue={type.maat_label ?? ""}
            className={`${invoerBreed} font-normal`}
          />
        </label>
        <div className="sm:col-span-2">
          <button className={knop}>Gegevens opslaan</button>
        </div>
      </ActieFormulier>
    </section>
  );
}

/** Kaart "Inhoud": alle vaste velden met een link ernaartoe en hoeveel beelden ze hebben, plus de opmaakuitleg. */
export function InhoudKaart({ velden, perVeld }: { velden: Veld[]; perVeld: Map<string, Sectie> }) {
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Inhoud</h2>
      <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {velden.map((v) => {
          const sec = perVeld.get(v.sleutel);
          return (
            <li
              key={v.sleutel}
              className={sec ? "" : "text-black/40 dark:text-white/40"}
            >
              <a
                href={`#veld-${v.sleutel}`}
                className="underline-offset-4 hover:underline"
              >
                {v.volgorde}. {v.kop}
              </a>
              <span className="text-xs">
                {" "}
                ·{" "}
                {sec
                  ? `${sec.beelden.length} ${sec.beelden.length === 1 ? "beeld" : "beelden"}`
                  : "leeg"}
              </span>
            </li>
          );
        })}
      </ol>
      <details className="text-sm">
        <summary className="cursor-pointer text-black/70 dark:text-white/70">
          Hoe werkt de opmaak van de tekst?
        </summary>
        <div className="mt-2">
          <OpmaakUitleg />
        </div>
      </details>
    </section>
  );
}
