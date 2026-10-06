"use client";

import { useActionState } from "react";
import { FFIT_TYPES } from "@/lib/lichaamstype-regels";
import { slaToewijzingOp, verwijderLichaamstype, type Status } from "./acties";
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
