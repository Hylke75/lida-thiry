"use client";

import { useActionState, useState } from "react";
import { STANDAARD_VERHOUDINGEN, minFormaat, verhoudingLabel, type Eisen } from "@/lib/beeldbank-regels";
import { leesVerhouding } from "@/lib/beeldbank-beheer";
import { slaEisenOp, type FormulierStatus } from "../acties";

const invoerKlasse =
  "w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";

const BEGIN: FormulierStatus = { ok: false, fouten: [] };

export function EisenFormulier({ id, eisen }: { id: string; eisen: Eisen | null }) {
  const [status, actie, bezig] = useActionState(slaEisenOp, BEGIN);
  const huidig = eisen ? `${eisen.verhouding_b}:${eisen.verhouding_h}` : "";
  const isStandaard = STANDAARD_VERHOUDINGEN.some(([b, h]) => `${b}:${h}` === huidig);
  const [keuze, setKeuze] = useState(isStandaard ? huidig : eisen ? "eigen" : "3:4");
  const [eigen, setEigen] = useState(isStandaard ? "" : huidig);
  const [minB, setMinB] = useState(eisen ? String(eisen.min_breedte) : "");
  const [minH, setMinH] = useState(eisen ? String(eisen.min_hoogte) : "");

  /** Vult het minimale formaat automatisch in bij een (nieuwe) verhouding. */
  function vulMinimum(tekst: string) {
    const v = leesVerhouding(tekst);
    if (!v) return;
    const m = minFormaat(v[0], v[1]);
    setMinB(String(m.min_breedte));
    setMinH(String(m.min_hoogte));
  }

  return (
    <form action={actie} className="flex flex-col gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="verhouding" className="text-sm font-medium">
            Verhouding (breedte : hoogte)
          </label>
          <select
            id="verhouding"
            name="verhouding"
            value={keuze}
            onChange={(e) => {
              setKeuze(e.target.value);
              if (e.target.value !== "eigen") vulMinimum(e.target.value);
            }}
            className={invoerKlasse}
          >
            {STANDAARD_VERHOUDINGEN.map(([b, h]) => (
              <option key={`${b}:${h}`} value={`${b}:${h}`}>
                {verhoudingLabel(b, h)}
              </option>
            ))}
            <option value="eigen">Andere verhouding…</option>
          </select>
        </div>
        {keuze === "eigen" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="eigen_verhouding" className="text-sm font-medium">
              Eigen verhouding
            </label>
            <input
              id="eigen_verhouding"
              name="eigen_verhouding"
              value={eigen}
              onChange={(e) => {
                setEigen(e.target.value);
                vulMinimum(e.target.value);
              }}
              placeholder="bijv. 7:5"
              className={invoerKlasse}
            />
          </div>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="min_breedte" className="text-sm font-medium">
            Minimale breedte (px)
          </label>
          <input
            id="min_breedte"
            name="min_breedte"
            type="number"
            min={50}
            max={10000}
            value={minB}
            onChange={(e) => setMinB(e.target.value)}
            className={invoerKlasse}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="min_hoogte" className="text-sm font-medium">
            Minimale hoogte (px)
          </label>
          <input
            id="min_hoogte"
            name="min_hoogte"
            type="number"
            min={50}
            max={10000}
            value={minH}
            onChange={(e) => setMinH(e.target.value)}
            className={invoerKlasse}
          />
        </div>
      </div>
      <p className="text-xs text-black/50 dark:text-white/50">
        Het minimale formaat wordt automatisch ingevuld (kortste zijde 600 px) wanneer je een verhouding kiest; je
        kunt het daarna nog aanpassen.
      </p>

      {status.fouten.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {status.fouten.map((f) => (
            <span key={f} className="block">
              • {f}
            </span>
          ))}
        </div>
      )}
      {status.ok && status.melding && !bezig && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          ✓ {status.melding}
        </p>
      )}
      <div>
        <button
          disabled={bezig}
          className="rounded-full border border-black/20 px-5 py-2 text-sm hover:border-accent disabled:opacity-50 dark:border-white/25"
        >
          {bezig ? "Bezig met opslaan…" : "Eisen opslaan"}
        </button>
      </div>
    </form>
  );
}
