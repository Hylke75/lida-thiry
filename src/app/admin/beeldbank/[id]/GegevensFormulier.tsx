"use client";

import { useActionState, useState } from "react";
import { NAAM_PATROON, ONDERDELEN, naamSuggestie } from "@/lib/beeldbank-regels";
import { STATUSSEN, STATUS_LABELS } from "@/lib/beeldbank-beheer";
import type { Beeld } from "@/lib/beeldbank";
import { slaGegevensOp, type FormulierStatus } from "../acties";

const invoerKlasse =
  "w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
const labelKlasse = "text-sm font-medium";
const uitlegKlasse = "text-xs leading-relaxed text-black/50 dark:text-white/50";

const BEGIN: FormulierStatus = { ok: false, fouten: [] };

export function GegevensFormulier({
  beeld,
  figuren,
}: {
  beeld: Beeld;
  /** Lichaamstypes (code + naam) uit beheer. */
  figuren: { code: string; naam: string }[];
}) {
  const [status, actie, bezig] = useActionState(slaGegevensOp, BEGIN);
  const [naam, setNaam] = useState(beeld.naam ?? "");
  const [onderdeel, setOnderdeel] = useState(beeld.onderdeel ?? "");
  const [omschrijving, setOmschrijving] = useState(beeld.omschrijving ?? "");
  const [figuur, setFiguur] = useState(beeld.figuur ?? "");
  const [advies, setAdvies] = useState(beeld.advies ?? "");

  const voorstel = naamSuggestie({ onderdeel, omschrijving, figuur, advies });
  const naamOngeldig = naam.trim() !== "" && !NAAM_PATROON.test(naam.trim().toLowerCase());
  const onderdeelBekend = !onderdeel || (ONDERDELEN as readonly string[]).includes(onderdeel);

  return (
    <form action={actie} className="flex flex-col gap-5">
      <input type="hidden" name="id" value={beeld.id} />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="onderdeel" className={labelKlasse}>
            Onderdeel
          </label>
          <select
            id="onderdeel"
            name="onderdeel"
            value={onderdeel}
            onChange={(e) => setOnderdeel(e.target.value)}
            className={invoerKlasse}
          >
            <option value="">— geen —</option>
            {!onderdeelBekend && <option value={onderdeel}>{onderdeel} (huidige waarde)</option>}
            {ONDERDELEN.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {!onderdeelBekend && (
            <p className={uitlegKlasse}>
              ‘{onderdeel}’ komt uit de oude bestanden. Kies liefst een onderdeel uit de lijst.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="omschrijving" className={labelKlasse}>
            Omschrijving
          </label>
          <input
            id="omschrijving"
            name="omschrijving"
            value={omschrijving}
            onChange={(e) => setOmschrijving(e.target.value)}
            placeholder="Bijvoorbeeld: v-hals"
            className={invoerKlasse}
          />
          <p className={uitlegKlasse}>Kort, wat er op de tekening staat.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="figuur" className={labelKlasse}>
            Figuur
          </label>
          <select id="figuur" name="figuur" value={figuur} onChange={(e) => setFiguur(e.target.value)} className={invoerKlasse}>
            <option value="">Alle lichaamstypes</option>
            {figuren.map((f) => (
              <option key={f.code} value={f.code}>
                {f.code} · {f.naam}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="advies" className={labelKlasse}>
            Advies
          </label>
          <select id="advies" name="advies" value={advies} onChange={(e) => setAdvies(e.target.value)} className={invoerKlasse}>
            <option value="">—</option>
            <option value="goed">Goed</option>
            <option value="vermijd">Vermijd</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="naam" className={labelKlasse}>
          Naam
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="naam"
            name="naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="onderdeel-omschrijving-figuur-advies"
            aria-invalid={naamOngeldig}
            className={`${invoerKlasse} font-mono ${naamOngeldig ? "border-red-500" : ""}`}
          />
          <button
            type="button"
            disabled={!voorstel}
            onClick={() => setNaam(voorstel)}
            className="whitespace-nowrap rounded-full border border-black/20 px-4 py-2 text-sm hover:border-accent disabled:opacity-40 dark:border-white/25"
          >
            Naam voorstellen
          </button>
        </div>
        <p className={naamOngeldig ? "text-xs text-red-600 dark:text-red-400" : uitlegKlasse}>
          {naamOngeldig
            ? "Alleen kleine letters, cijfers en losse streepjes (geen spaties of leestekens)."
            : voorstel
              ? `Voorstel op basis van de velden hierboven: ${voorstel}`
              : "Vul onderdeel, omschrijving, figuur en advies in; dan kun je een naam laten voorstellen."}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bijschrift" className={labelKlasse}>
          Bijschrift
        </label>
        <textarea
          id="bijschrift"
          name="bijschrift"
          defaultValue={beeld.bijschrift ?? ""}
          rows={2}
          className={invoerKlasse}
        />
        <p className={uitlegKlasse}>
          Deze tekst komt in de PDF onder het beeld te staan. Laat leeg als er geen tekst onder hoeft.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="status" className={labelKlasse}>
          Status
        </label>
        <select id="status" name="status" defaultValue={beeld.status} className={`${invoerKlasse} sm:max-w-xs`}>
          {STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <p className={uitlegKlasse}>
          Zet een beeld op ‘Goedgekeurd’ als je tevreden bent met de tekening; zo houd je bij wat nog moet.
        </p>
      </div>

      {status.fouten.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <span className="block font-medium">Niet opgeslagen:</span>
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
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {bezig ? "Bezig met opslaan…" : "Gegevens opslaan"}
        </button>
      </div>
    </form>
  );
}
