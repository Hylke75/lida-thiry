"use client";

import { MENU_LABEL_MAX, slugSuggestie } from "@/lib/paginas/beheer";
import { Draaier, Teller, Veld, Vinkje } from "@/components/admin/editor/onderdelen";
import { invoerBreed, kaart, knop, knopSecundair, tekstFout, tekstZacht } from "@/components/admin/stijl";
import { StatusBadge } from "./onderdelen";
import type { PaginaEditorStaat } from "./usePaginaEditor";
import { schoonSlug, slugTijdensTypen } from "./velden";

/** Kaart "Webadres en menu": slug (met waarschuwingen), menu/footer, menunaam en volgorde. */
export function WebadresKaart({ editor }: { editor: PaginaEditorStaat }) {
  const { v, zet, url, slugMelding, online, opgeslagen, slugAuto, setSlugAuto } = editor;
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Webadres en menu</h2>
      <Veld
        label="Webadres"
        htmlFor="slug"
        uitlegAls="div"
        uitleg={
          <>
            <span className="break-all">{url}</span>
            {slugMelding && <span className={`mt-1 block font-medium ${tekstFout}`}>{slugMelding}</span>}
            {online && v.slug !== opgeslagen.slug && (
              <span className="mt-1 block font-medium text-amber-700 dark:text-amber-300">
                Let op: deze pagina staat al online. Bij opslaan stuurt het oude adres bezoekers automatisch door naar het nieuwe (zie Doorverwijzingen); werk links op andere plekken liefst ook bij.
              </span>
            )}
          </>
        }
      >
        <div className="flex gap-2">
          <input
            id="slug"
            value={v.slug}
            maxLength={80}
            aria-invalid={Boolean(slugMelding)}
            onChange={(e) => {
              setSlugAuto(false);
              zet({ slug: slugTijdensTypen(e.target.value) });
            }}
            onBlur={() => {
              const schoon = schoonSlug(v.slug);
              if (schoon !== v.slug) zet({ slug: schoon });
            }}
            className={invoerBreed}
          />
          {!slugAuto && slugSuggestie(v.titel) !== v.slug && (
            <button type="button" onClick={() => zet({ slug: slugSuggestie(v.titel) })} className={`${knopSecundair} shrink-0`} title="Webadres opnieuw maken uit de titel">
              Uit titel
            </button>
          )}
        </div>
      </Veld>
      <Vinkje checked={v.in_menu} onChange={(b) => zet({ in_menu: b })} titel="In het menu bovenaan" uitleg="Alleen zichtbaar zolang de pagina online staat." />
      <Vinkje checked={v.in_footer} onChange={(b) => zet({ in_footer: b })} titel="In de footer (onderaan elke pagina)" />
      <div className="grid min-w-0 gap-4 sm:grid-cols-[1fr_8rem]">
        <Veld label="Naam in het menu" htmlFor="menu-label" uitlegAls="div" teller={<Teller waarde={v.menu_label} max={MENU_LABEL_MAX} />} uitleg="Leeg = de titel.">
          <input id="menu-label" value={v.menu_label} maxLength={MENU_LABEL_MAX} onChange={(e) => zet({ menu_label: e.target.value })} className={invoerBreed} placeholder={v.titel} />
        </Veld>
        <Veld label="Volgorde" htmlFor="volgorde" uitlegAls="div" uitleg="Laag = eerst.">
          <input id="volgorde" type="number" inputMode="numeric" step={1} value={v.volgorde} onChange={(e) => zet({ volgorde: e.target.value })} className={invoerBreed} />
        </Veld>
      </div>
    </section>
  );
}

/** Kaart "Publiceren": status, wat er nog moet gebeuren, publiceren of offline halen. */
export function PublicerenKaart({ editor }: { editor: PaginaEditorStaat }) {
  const { opgeslagen, online, problemen, plekken, bezig, kanPubliceren } = editor;
  return (
    <section className={kaart}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Publiceren</h2>
        <StatusBadge status={opgeslagen.status} />
      </div>
      <p className={`text-sm ${tekstZacht}`}>
        {online
          ? "Deze pagina staat online. Wijzigingen zijn zichtbaar zodra je opslaat."
          : "Deze pagina is een concept en alleen voor jou zichtbaar (ook niet in het menu)."}
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
            <p className="mt-2 text-xs">
              Invulplekken zoals <code>[aan te vullen: …]</code> en <code>[foto: …]</code> zijn aanwijzingen voor jou: vul ze in of haal ze weg. Een fotoplek
              vervang je door de cursor op die regel te zetten en op 📷 Foto te klikken.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        {!online && (
          <button type="button" onClick={editor.nuPubliceren} disabled={!kanPubliceren} className={`${knop} w-fit`}>
            {bezig === "publiceren" ? (
              <>
                <Draaier /> Publiceren…
              </>
            ) : (
              "Publiceren"
            )}
          </button>
        )}
        {online && (
          <button type="button" onClick={editor.offline} disabled={Boolean(bezig)} className={`${knopSecundair} w-fit`}>
            Offline halen (terug naar concept)
          </button>
        )}
      </div>
    </section>
  );
}
