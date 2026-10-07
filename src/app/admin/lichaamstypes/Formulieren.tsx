"use client";

import { useActionState } from "react";
import { FFIT_TYPES } from "@/lib/lichaamstype-regels";
import { slaExtraFiguurtypesOp, slaToewijzingOp, verwijderLichaamstype, type Status } from "./acties";
import { invoerBreed, knop, knopGevaar, toon } from "@/components/admin/stijl";

function Uitkomst({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <p
      role={status.ok ? "status" : "alert"}
      className={`rounded-lg px-4 py-3 text-sm ${
        status.ok
          ? toon.groen
          : toon.rood
      }`}
    >
      {status.melding}
    </p>
  );
}

/** Koppeling: uitkomst van de berekening (FFIT-type) -> lichaamstype. */
export function ToewijzingFormulier({
  toewijzing,
  types,
}: {
  toewijzing: Record<string, string | null>;
  types: { code: string; naam: string; actief: boolean }[];
}) {
  const [status, actie, bezig] = useActionState<Status | null, FormData>(slaToewijzingOp, null);
  return (
    <form action={actie} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {FFIT_TYPES.map((f) => (
          <label key={f} className="flex flex-col gap-1 text-sm font-medium">
            Uitkomst &ldquo;{f}&rdquo;
            <select name={`ffit_${f}`} defaultValue={toewijzing[f] ?? ""} required className={invoerBreed}>
              <option value="" disabled>
                Kies een lichaamstype
              </option>
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.code} · {t.naam}
                  {t.actief ? "" : " (niet actief)"}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <Uitkomst status={status} />
      <div>
        <button
          disabled={bezig}
          className={knop}
        >
          {bezig ? "Bezig…" : "Koppeling opslaan"}
        </button>
      </div>
    </form>
  );
}

/**
 * Schakelaar voor de extra figuurtypes I en O in de berekening (standaard uit),
 * met per type wat er nog ontbreekt.
 */
export function ExtraFiguurtypesFormulier({
  aan,
  ontbreekt,
}: {
  aan: boolean;
  /** Per extra type (I, O) wat er nog ontbreekt; leeg = klaar. */
  ontbreekt: { code: string; naam: string; fouten: string[] }[];
}) {
  const [status, actie, bezig] = useActionState<Status | null, FormData>(slaExtraFiguurtypesOp, null);
  const nietKlaar = ontbreekt.filter((t) => t.fouten.length > 0);
  return (
    <form action={actie} className="flex flex-col gap-3">
      <p className={`rounded-lg px-4 py-3 text-sm ${nietKlaar.length ? toon.amber : toon.groen}`}>
        {nietKlaar.length ? (
          <>
            <strong>Let op:</strong> I en O moeten eerst <strong>actief</strong> zijn en <strong>12 hand-outs met inhoud</strong>{" "}
            hebben. Zolang dat niet zo is, geeft de berekening ze niet, ook niet als deze schakelaar aan staat. Nog niet klaar:{" "}
            {nietKlaar.map((t) => `${t.code} · ${t.naam}`).join(" en ")}.
          </>
        ) : (
          <>I en O zijn actief en alle hand-outs hebben inhoud.</>
        )}
      </p>
      {nietKlaar.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-foreground/70">
          {nietKlaar.flatMap((t) => t.fouten).map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      )}
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Extra figuurtypes I en O in de berekening</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="extra_figuurtypes" value="uit" defaultChecked={!aan} />
          Uit (standaard): de test geeft alleen de gewone types en vraagt niet naar de bandmaat
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="extra_figuurtypes" value="aan" defaultChecked={aan} />
          Aan: de test vraagt (optioneel) naar de bandmaat en kan I of O geven
        </label>
      </fieldset>
      <Uitkomst status={status} />
      <div>
        <button disabled={bezig} className={knop}>
          {bezig ? "Bezig…" : "Schakelaar opslaan"}
        </button>
      </div>
    </form>
  );
}

/** Verwijderen met bevestiging door de code over te typen. */
export function VerwijderFormulier({ code, naam }: { code: string; naam: string }) {
  const [status, actie, bezig] = useActionState<Status | null, FormData>(verwijderLichaamstype, null);
  return (
    <form
      action={actie}
      onSubmit={(e) => {
        if (!window.confirm(`${code} · ${naam} definitief verwijderen, inclusief de 12 hand-outs?`)) e.preventDefault();
      }}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="code" value={code} />
      <label className="flex flex-col gap-1 text-sm font-medium">
        Typ ter bevestiging de code <span className="font-mono">{code}</span>
        <input name="bevestiging" autoComplete="off" className={`${invoerBreed} max-w-40 uppercase`} />
      </label>
      <Uitkomst status={status} />
      <div>
        <button
          disabled={bezig}
          className={knopGevaar}
        >
          {bezig ? "Bezig…" : "Lichaamstype verwijderen"}
        </button>
      </div>
    </form>
  );
}
