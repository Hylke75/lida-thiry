"use client";

import { useActionState } from "react";
import { FFIT_TYPES } from "@/lib/lichaamstype-regels";
import { slaToewijzingOp, verwijderLichaamstype, type Status } from "./acties";

function Uitkomst({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <p
      role={status.ok ? "status" : "alert"}
      className={`rounded-lg px-4 py-3 text-sm ${
        status.ok
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {status.melding}
    </p>
  );
}

const invoer =
  "w-full rounded-lg border border-black/15 bg-background px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";

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
            <select name={`ffit_${f}`} defaultValue={toewijzing[f] ?? ""} required className={invoer}>
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
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
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
        <input name="bevestiging" autoComplete="off" className={`${invoer} max-w-40 uppercase`} />
      </label>
      <Uitkomst status={status} />
      <div>
        <button
          disabled={bezig}
          className="rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          {bezig ? "Bezig…" : "Lichaamstype verwijderen"}
        </button>
      </div>
    </form>
  );
}
