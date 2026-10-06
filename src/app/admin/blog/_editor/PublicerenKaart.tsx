"use client";

import { toonDatumTijd } from "@/lib/datum";
import { Draaier } from "@/components/admin/editor/onderdelen";
import { invoerBreed, kaart, knop, knopKlein, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import { alsNieuwsbrief } from "../acties";
import { ZichtbaarheidBadge } from "./badges";
import type { BlogEditorStaat } from "./useBlogEditor";

/** Kaart "Publiceren": status, wat er nog moet gebeuren, AI-controle, publiceren, inplannen en terug naar concept. */
export function PublicerenKaart({ editor }: { editor: BlogEditorStaat }) {
  const { zichtbaar, opgeslagen, problemen, plekken, nogTeControleren, gecontroleerd, setGecontroleerd, bezig, kanPubliceren, moment, setMoment, gewijzigd } = editor;
  return (
    <section className={kaart}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Publiceren</h2>
        <ZichtbaarheidBadge status={zichtbaar} />
      </div>
      <p className={`text-sm ${tekstZacht}`}>
        {zichtbaar === "online"
          ? `Dit bericht staat online sinds ${toonDatumTijd(opgeslagen.gepubliceerd_op)}. Wijzigingen zijn zichtbaar zodra je opslaat.`
          : zichtbaar === "ingepland"
            ? `Dit bericht verschijnt automatisch op ${toonDatumTijd(opgeslagen.gepubliceerd_op)}.`
            : "Dit bericht is een concept en alleen voor jou zichtbaar."}
      </p>

      {problemen.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Nog te doen voordat je kunt publiceren:</p>
          <ul className="mt-1 list-disc pl-5">
            {problemen.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          {plekken.length > 0 && (
            <>
              <p className="mt-2 text-xs">
                Invulplekken zoals <code>[foto: …]</code> zijn aanwijzingen voor jou. Vervang een fotoplek door een echte foto (zet de cursor op de
                regel en klik op 📷 Foto), vul de andere aan, of haal ze weg.
              </p>
              <ul className="mt-2 flex flex-col gap-1">
                {plekken.slice(0, 12).map((p) => (
                  <li key={p.start} className="flex min-w-0 items-center justify-between gap-2 text-xs">
                    <code className="min-w-0 truncate">{p.tekst}</code>
                    <button type="button" onClick={() => editor.tekst.selecteer(p.start, p.eind)} className={`${knopKlein} shrink-0`}>
                      Aanwijzen
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {nogTeControleren && zichtbaar === "concept" && (
        <label className="flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
          <input type="checkbox" checked={gecontroleerd} onChange={(e) => setGecontroleerd(e.target.checked)} className="mt-0.5 size-4" />
          <span>
            <span className="font-medium">Ik heb de tekst gelezen en gecontroleerd.</span>
            <span className="block text-xs">
              Deze tekst is door AI geschreven. AI kan fouten maken of dingen stellig beweren die niet kloppen. Jij bent verantwoordelijk voor wat er
              op je site staat.
            </span>
          </span>
        </label>
      )}

      <div className="flex flex-col gap-3">
        {zichtbaar !== "online" && (
          <button type="button" onClick={editor.nuPubliceren} disabled={!kanPubliceren} className={`${knop} w-fit`}>
            {bezig === "publiceren" ? (
              <>
                <Draaier /> Publiceren…
              </>
            ) : (
              "Nu publiceren"
            )}
          </button>
        )}
        {zichtbaar !== "online" && (
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="moment" className="text-sm font-medium">
              {zichtbaar === "ingepland" ? "Ander moment kiezen" : "Of inplannen voor later"}
            </label>
            <div className="flex flex-wrap gap-2">
              <input id="moment" type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className={`${invoerBreed} w-auto`} />
              <button type="button" onClick={editor.inplannen} disabled={!kanPubliceren || !moment} className={knopSecundair}>
                {bezig === "inplannen" ? "Bezig…" : zichtbaar === "ingepland" ? "Planning wijzigen" : "Inplannen"}
              </button>
            </div>
            <p className={`text-xs ${tekstZacht}`}>Nederlandse tijd.</p>
          </div>
        )}
        {zichtbaar !== "concept" && (
          <button type="button" onClick={editor.terugNaarConcept} disabled={Boolean(bezig)} className={`${knopSecundair} w-fit`}>
            {zichtbaar === "online" ? "Offline halen (terug naar concept)" : "Planning annuleren (terug naar concept)"}
          </button>
        )}
        {zichtbaar !== "concept" && gewijzigd && <p className={`text-xs ${tekstZacht}`}>Wijzigingen aan een gepubliceerd bericht worden zichtbaar zodra je opslaat.</p>}
      </div>
    </section>
  );
}

/** Kaart om van het bericht een nieuwsbriefcampagne te maken (niet voor concepten). */
export function NieuwsbriefKaart({ editor }: { editor: Pick<BlogEditorStaat, "id" | "zichtbaar" | "gewijzigd" | "bezig"> }) {
  const { id, zichtbaar, gewijzigd, bezig } = editor;
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Als nieuwsbrief versturen</h2>
      <p className={`text-sm ${tekstZacht}`}>
        Maakt een nieuwe campagne met de omslagfoto, de titel, de samenvatting, het begin van de tekst en een knop &quot;Lees verder&quot; naar dit bericht. Je
        kunt de campagne daarna nog aanpassen en kiest zelf wanneer en naar wie hij gaat.
      </p>
      {zichtbaar === "concept" ? (
        <p className={`text-xs ${tekstZacht}`}>Beschikbaar zodra het bericht online staat of is ingepland.</p>
      ) : (
        <form action={alsNieuwsbrief} className="flex flex-col gap-1">
          <input type="hidden" name="id" value={id} />
          <button disabled={gewijzigd || Boolean(bezig)} className={`${knopSecundair} w-fit`}>
            Nieuwsbrief maken van dit bericht
          </button>
          {gewijzigd && <p className={`text-xs ${tekstZacht}`}>Sla eerst je wijzigingen op.</p>}
        </form>
      )}
    </section>
  );
}
