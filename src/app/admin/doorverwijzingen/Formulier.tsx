"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Melding } from "../Melding";
import { bewaarDoorverwijzing, type BewaarStaat } from "./acties";
import { invoer, knop } from "@/components/admin/stijl";

export interface FormulierWaarden {
  id: string;
  van: string;
  naar: string;
  permanent: boolean;
  automatisch: boolean;
}

/** Toevoegen (zonder `waarden`) of aanpassen van een doorverwijzing. */
export function DoorverwijzingFormulier({ waarden }: { waarden?: FormulierWaarden }) {
  const [staat, actie, bezig] = useActionState<BewaarStaat, FormData>(bewaarDoorverwijzing, null);
  return (
    <form action={actie} className="flex flex-col gap-3">
      {waarden && <input type="hidden" name="id" value={waarden.id} />}
      {staat?.fouten.length ? (
        <Melding soort="fout">
          {staat.fouten.length === 1 ? (
            staat.fouten[0]
          ) : (
            <span className="flex flex-col gap-1">
              {staat.fouten.map((f) => (
                <span key={f}>{f}</span>
              ))}
            </span>
          )}
        </Melding>
      ) : null}
      {waarden?.automatisch && (
        <p className="text-xs text-foreground/70">
          Deze doorverwijzing is automatisch gemaakt toen een webadres veranderde. Pas je hem aan, dan telt hij voortaan als handmatig.
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/70 dark:text-white/70">Oud adres *</span>
          <input name="van" required defaultValue={waarden?.van} placeholder="/oude-pagina" className={`${invoer} font-mono`} autoComplete="off" />
          <span className="text-xs text-foreground/70">Alleen het pad, beginnend met /.</span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/70 dark:text-white/70">Nieuw adres *</span>
          <input
            name="naar"
            required
            defaultValue={waarden?.naar}
            placeholder="/nieuwe-pagina of https://…"
            className={`${invoer} font-mono`}
            autoComplete="off"
          />
          <span className="text-xs text-foreground/70">Een pad op deze site of een https://-adres.</span>
        </label>
      </div>
      <fieldset className="flex flex-wrap gap-4 text-sm">
        <legend className="sr-only">Soort</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="permanent" value="ja" defaultChecked={waarden ? waarden.permanent : true} />
          <span>
            Permanent <span className="text-foreground/70">(301; zoekmachines nemen het nieuwe adres over)</span>
          </span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="permanent" value="nee" defaultChecked={waarden ? !waarden.permanent : false} />
          <span>
            Tijdelijk <span className="text-foreground/70">(302; bijv. een actie)</span>
          </span>
        </label>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={bezig} className={knop}>
          {bezig ? "Bezig…" : waarden ? "Opslaan" : "Toevoegen"}
        </button>
        {waarden && (
          <Link href="/admin/doorverwijzingen" className="text-sm underline underline-offset-4">
            Annuleren
          </Link>
        )}
      </div>
    </form>
  );
}
