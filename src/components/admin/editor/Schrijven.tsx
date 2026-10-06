import type { ReactNode } from "react";
import type { Opmaakknop } from "@/lib/blog/beheer";
import { MediaKiezer } from "../MediaKiezer";
import { invoerBreed, knopKlein, knopSecundair, tekstZacht } from "../stijl";
import { FotoUpload } from "./FotoUpload";
import type { EditorUploadSoort } from "./upload-actie";
import { Veld } from "./onderdelen";
import type { EditorTab } from "./useTekstvak";

// Onderdelen rond het tekstvak: tabs (smal scherm), opmaakwerkbalk en het paneel om een foto in te voegen.

/** Op smalle schermen: wisselen tussen schrijven en het voorbeeld. */
export function SchrijfTabs({ tab, onTab }: { tab: EditorTab; onTab: (t: EditorTab) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-black/5 p-1 text-sm lg:hidden dark:bg-white/10" role="tablist">
      {(["schrijven", "voorbeeld"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={tab === t}
          onClick={() => onTab(t)}
          className={`flex-1 rounded-full px-3 py-1.5 ${tab === t ? "bg-kaart font-medium shadow-sm" : tekstZacht}`}
        >
          {t === "schrijven" ? "Schrijven" : "Voorbeeld"}
        </button>
      ))}
    </div>
  );
}

export type WerkbalkKnop = { knop: Opmaakknop; label: ReactNode; titel: string };

/** Werkbalk met opmaakknoppen en de fotoknop; `children` komt er achteraan (bijv. "Blok invoegen"). */
export function OpmaakWerkbalk({
  knoppen,
  onOpmaak,
  onFoto,
  children,
}: {
  knoppen: WerkbalkKnop[];
  onOpmaak: (knop: Opmaakknop) => void;
  onFoto: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Opmaak">
      {knoppen.map((w) => (
        <button key={w.knop} type="button" title={w.titel} onMouseDown={(e) => e.preventDefault()} onClick={() => onOpmaak(w.knop)} className={knopKlein}>
          {w.label}
        </button>
      ))}
      <button type="button" title="Foto uploaden en op de plek van de cursor invoegen" onMouseDown={(e) => e.preventDefault()} onClick={onFoto} className={knopKlein}>
        📷 Foto
      </button>
      {children}
    </div>
  );
}

/** Paneel om een foto (upload of uit de mediabibliotheek) op de plek van de cursor in te voegen. */
export function FotoInvoegen({
  alt,
  onAlt,
  soort,
  placeholder,
  uitlegAls,
  onIngevoegd,
  onAnnuleer,
}: {
  alt: string;
  onAlt: (alt: string) => void;
  soort: EditorUploadSoort;
  placeholder: string;
  uitlegAls?: "p" | "div";
  onIngevoegd: (url: string, altUitBibliotheek?: string) => void;
  onAnnuleer: () => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
      <Veld label="Korte omschrijving van de foto" htmlFor="foto-alt" uitlegAls={uitlegAls} uitleg="Voor slechtzienden en Google. De foto komt op de plek van de cursor (of vervangt de [foto: …]-regel waar de cursor op staat).">
        <input id="foto-alt" value={alt} maxLength={200} onChange={(e) => onAlt(e.target.value)} className={invoerBreed} placeholder={placeholder} />
      </Veld>
      <div className="flex flex-wrap items-start gap-2">
        <FotoUpload soort={soort} map="afbeeldingen" label="Foto kiezen en invoegen" disabled={!alt.trim()} onUrl={(u) => onIngevoegd(u)} />
        <MediaKiezer accept="foto" map={soort} knopTekst="Uit mediabibliotheek" titel="Foto invoegen" onKies={(m) => onIngevoegd(m.url, m.alt)} />
        <button type="button" onClick={onAnnuleer} className={knopSecundair}>
          Annuleren
        </button>
      </div>
    </div>
  );
}
