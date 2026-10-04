"use client";

import { knopKlein } from "./stijl";

/** Verwijderknop met bevestiging; roept een server action aan met het id. */
export function VerwijderKnop({
  id,
  naam,
  actie,
  extra,
}: {
  id: string;
  naam: string;
  actie: (formData: FormData) => Promise<void>;
  extra?: string;
}) {
  return (
    <form
      action={actie}
      onSubmit={(e) => {
        if (!confirm(`"${naam}" verwijderen? ${extra ? `${extra} ` : ""}Dit kun je niet ongedaan maken.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={`${knopKlein} text-red-700 dark:text-red-300`}>Verwijderen</button>
    </form>
  );
}
