"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { zoekInMedia } from "@/app/admin/media/acties";
import { formatAfmetingen, MAP_SUGGESTIES, normaliseerMap, STANDAARD_MAP, type MediaItem, type MediaSoort } from "@/lib/media/regels";
import { Afbeelding } from "@/components/Afbeelding";
import { MediaUploader } from "./MediaUploader";

/** Wat de kiezer teruggeeft. */
interface GekozenMedia {
  id: string;
  url: string;
  alt: string;
  breedte: number | null;
  hoogte: number | null;
}

export interface MediaKiezerProps {
  /** Wordt aangeroepen met de gekozen (of net geüploade) afbeelding; daarna sluit de kiezer. */
  onKies: (media: GekozenMedia) => void;
  /**
   * Welke bestanden: "afbeelding" (standaard: JPG/PNG/GIF/WebP/SVG), "icoon" (PNG/SVG/ICO)
   * of "foto" (alleen JPG/PNG/GIF/WebP, bijv. voor e-mail).
   */
  accept?: MediaSoort;
  /** Map voor nieuwe uploads (standaard "algemeen"); de bibliotheek toont eerst alles. */
  map?: string;
  /** Tekst op de knop (standaard "Kies uit mediabibliotheek"). */
  knopTekst?: string;
  /** Eigen Tailwind-klassen voor de knop. */
  knopKlasse?: string;
  /** Titel boven de dialoog (standaard "Afbeelding kiezen"). */
  titel?: string;
  disabled?: boolean;
}

const KNOP =
  "w-fit rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5";
const INVOER =
  "w-full min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
const PER_PAGINA = 24;

/**
 * Knop die een dialoog opent om een afbeelding uit de mediabibliotheek te kiezen
 * of een nieuwe te uploaden.
 *
 * @example
 * <MediaKiezer accept="icoon" map="logo" knopTekst="Favicon kiezen" onKies={({ url }) => zet(url)} />
 */
export function MediaKiezer({
  onKies,
  accept = "afbeelding",
  map = STANDAARD_MAP,
  knopTekst = "Kies uit mediabibliotheek",
  knopKlasse = KNOP,
  titel = "Afbeelding kiezen",
  disabled,
}: MediaKiezerProps) {
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);

  const sluit = useCallback(() => {
    setOpen(false);
    knop.current?.focus();
  }, []);

  return (
    <>
      <button ref={knop} type="button" disabled={disabled} onClick={() => setOpen(true)} className={knopKlasse} aria-haspopup="dialog">
        {knopTekst}
      </button>
      {open &&
        createPortal(
        <KiezerDialoog
          titel={titel}
          soort={accept}
          map={normaliseerMap(map) ?? STANDAARD_MAP}
          onSluit={sluit}
          onKies={(m) => {
            sluit();
            onKies({ id: m.id, url: m.url, alt: m.alt, breedte: m.breedte, hoogte: m.hoogte });
          }}
        />,
          document.body,
        )}
    </>
  );
}

function KiezerDialoog({
  titel,
  soort,
  map,
  onSluit,
  onKies,
}: {
  titel: string;
  soort: MediaSoort;
  map: string;
  onSluit: () => void;
  onKies: (m: MediaItem) => void;
}) {
  const titelId = useId();
  const dialoog = useRef<HTMLDivElement>(null);
  const zoekvak = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"bibliotheek" | "uploaden">("bibliotheek");
  const [q, setQ] = useState("");
  const [filterMap, setFilterMap] = useState("");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [mappen, setMappen] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);
  const [paginas, setPaginas] = useState(1);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [gekozen, setGekozen] = useState<MediaItem | null>(null);
  const [uploadMap, setUploadMap] = useState(map);

  const laad = useCallback(
    async (p: number, erbij: boolean) => {
      setLaden(true);
      setFout(null);
      try {
        const r = await zoekInMedia({ q, map: filterMap, soort, pagina: p, perPagina: PER_PAGINA });
        if (!r.ok) return setFout(r.fout);
        setItems((oud) => (erbij ? [...oud, ...r.resultaat.items.filter((n) => !oud.some((o) => o.id === n.id))] : r.resultaat.items));
        setPagina(r.resultaat.pagina);
        setPaginas(r.resultaat.paginas);
        setMappen(r.mappen);
      } catch {
        setFout("Laden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.");
      } finally {
        setLaden(false);
      }
    },
    [q, filterMap, soort],
  );

  // Zoeken met een kleine vertraging tijdens het typen.
  useEffect(() => {
    const t = setTimeout(() => void laad(1, false), q ? 300 : 0);
    return () => clearTimeout(t);
  }, [laad, q]);

  // Pagina erachter niet laten scrollen; focus in de dialoog.
  useEffect(() => {
    const oud = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    zoekvak.current?.focus();
    return () => {
      document.body.style.overflow = oud;
    };
  }, []);

  function toets(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onSluit();
      return;
    }
    if (e.key !== "Tab" || !dialoog.current) return;
    const focusbaar = Array.from(
      dialoog.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (!focusbaar.length) return;
    const eerste = focusbaar[0];
    const laatste = focusbaar[focusbaar.length - 1];
    if (e.shiftKey && document.activeElement === eerste) {
      e.preventDefault();
      laatste.focus();
    } else if (!e.shiftKey && document.activeElement === laatste) {
      e.preventDefault();
      eerste.focus();
    }
  }

  const tabKlasse = (actief: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ${actief ? "bg-accent-zacht font-medium text-accent" : "text-black/60 hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onSluit();
      }}
    >
      <div
        ref={dialoog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        onKeyDown={toets}
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-kaart text-foreground shadow-xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 dark:border-white/15">
          <h2 id={titelId} className="text-lg font-semibold">
            {titel}
          </h2>
          <button type="button" onClick={onSluit} className="rounded-full px-3 py-1.5 text-sm hover:bg-black/5 dark:hover:bg-white/5" aria-label="Sluiten">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-4 pt-3" role="tablist" aria-label="Kiezen of uploaden">
          <button type="button" role="tab" aria-selected={tab === "bibliotheek"} className={tabKlasse(tab === "bibliotheek")} onClick={() => setTab("bibliotheek")}>
            Bibliotheek
          </button>
          <button type="button" role="tab" aria-selected={tab === "uploaden"} className={tabKlasse(tab === "uploaden")} onClick={() => setTab("uploaden")}>
            Uploaden
          </button>
        </div>

        {tab === "bibliotheek" ? (
          <>
            <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row">
              <input
                ref={zoekvak}
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Zoek op naam of omschrijving…"
                aria-label="Zoeken"
                className={INVOER}
              />
              <select value={filterMap} onChange={(e) => setFilterMap(e.target.value)} aria-label="Map" className={`${INVOER} sm:w-48`}>
                <option value="">Alle mappen</option>
                {mappen.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-h-40 flex-1 overflow-y-auto px-4 pb-3">
              {fout && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">{fout}</p>}
              {!laden && !fout && items.length === 0 && (
                <p className="py-8 text-center text-sm text-black/55 dark:text-white/55">
                  {q || filterMap ? "Niets gevonden." : "Nog geen afbeeldingen. "}
                  <button type="button" className="text-accent underline underline-offset-2" onClick={() => setTab("uploaden")}>
                    Upload er een
                  </button>
                  .
                </p>
              )}
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {items.map((m) => {
                  const actief = gekozen?.id === m.id;
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => setGekozen(m)}
                        onDoubleClick={() => onKies(m)}
                        aria-pressed={actief}
                        title={m.alt || m.naam}
                        className={`flex w-full flex-col overflow-hidden rounded-lg border text-left ${
                          actief ? "border-accent ring-2 ring-accent" : "border-black/10 hover:border-accent/60 dark:border-white/15"
                        }`}
                      >
                        <span className="relative flex aspect-square w-full items-center justify-center bg-[repeating-conic-gradient(#0000000d_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                          {/* Miniatuur via next/image (SVG/ICO als gewone <img>, zie components/Afbeelding.tsx). */}
                          <Afbeelding vullen src={m.url} alt="" sizes="160px" className="object-contain" />
                        </span>
                        <span className="truncate px-2 py-1 text-xs">{m.naam}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {laden && <p className="py-4 text-center text-sm text-black/55 dark:text-white/55">Laden…</p>}
              {!laden && pagina < paginas && (
                <div className="flex justify-center pt-3">
                  <button type="button" onClick={() => void laad(pagina + 1, true)} className={KNOP}>
                    Meer laden
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 px-4 py-3 dark:border-white/15">
              <p className="min-w-0 truncate text-sm text-black/60 dark:text-white/60">
                {gekozen ? (
                  <>
                    <span className="font-medium text-foreground">{gekozen.naam}</span>
                    {formatAfmetingen(gekozen.breedte, gekozen.hoogte) && ` · ${formatAfmetingen(gekozen.breedte, gekozen.hoogte)}`}
                  </>
                ) : (
                  "Klik op een afbeelding om hem te kiezen."
                )}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={onSluit} className={KNOP}>
                  Annuleren
                </button>
                <button
                  type="button"
                  disabled={!gekozen}
                  onClick={() => gekozen && onKies(gekozen)}
                  className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                >
                  Gebruiken
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3">
            <label className="flex max-w-xs flex-col gap-1 text-xs font-medium text-black/70 dark:text-white/70">
              Map
              <input
                list={`${titelId}-mappen`}
                value={uploadMap}
                onChange={(e) => setUploadMap(e.target.value)}
                onBlur={() => setUploadMap(normaliseerMap(uploadMap) ?? map)}
                className={INVOER}
              />
              <datalist id={`${titelId}-mappen`}>
                {[...new Set([...MAP_SUGGESTIES, ...mappen])].map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            <MediaUploader
              map={normaliseerMap(uploadMap) ?? map}
              soort={soort}
              onKlaar={(nieuw) => {
                if (nieuw.length === 1) return onKies(nieuw[0]);
                if (nieuw.length > 1) {
                  setGekozen(nieuw[0]);
                  setQ("");
                  setFilterMap("");
                  setTab("bibliotheek");
                  void laad(1, false);
                }
              }}
            />
            <p className="text-xs text-black/55 dark:text-white/55">
              Eén bestand wordt na het uploaden meteen gekozen. Bij meerdere bestanden kies je daarna zelf in de bibliotheek. Pas de omschrijving (alt-tekst) aan in de
              mediabibliotheek of in het veld van je editor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
