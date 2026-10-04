"use client";

/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */

import { useRef, useState, useTransition } from "react";
import { ONDERDELEN, slug } from "@/lib/beeldbank-regels";
import { voegBeeldToe, zoekBeelden } from "./acties";
import type { GevondenBeeld, Uitkomst } from "./uitkomst";

/** Onderdeel dat bij een sectiekop hoort, bijv. "Je jasjes en mantels" -> "jasjes-en-mantels". */
function onderdeelBijKop(kop: string): string {
  const s = slug(kop.replace(/^je\s+/i, ""));
  if (s === "voorbeeldoutfits") return "outfits";
  return (ONDERDELEN as readonly string[]).includes(s) ? s : "";
}

/**
 * Knop 'Beeld toevoegen' met een venster om in de centrale beeldbank te zoeken.
 * Een gekozen beeld komt achteraan in de sectie.
 */
export function BeeldKiezer({
  sleutel,
  sectieId,
  kop,
  aanwezig,
}: {
  sleutel: string;
  sectieId: string;
  kop: string;
  aanwezig: string[];
}) {
  const venster = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const zoekNummer = useRef(0);
  const [zoek, setZoek] = useState("");
  const [onderdeel, setOnderdeel] = useState(() => onderdeelBijKop(kop));
  const [resultaten, setResultaten] = useState<GevondenBeeld[] | null>(null);
  const [zoekt, setZoekt] = useState(false);
  const [uitkomst, setUitkomst] = useState<Uitkomst | null>(null);
  const [toevoegen, startToevoegen] = useTransition();

  async function voerZoekUit(term: string, deel: string) {
    const nummer = ++zoekNummer.current;
    setZoekt(true);
    try {
      const lijst = await zoekBeelden(term, deel);
      // Alleen het antwoord op de laatste zoekopdracht tonen.
      if (nummer === zoekNummer.current) setResultaten(lijst);
    } catch {
      if (nummer === zoekNummer.current) setResultaten([]);
    } finally {
      if (nummer === zoekNummer.current) setZoekt(false);
    }
  }

  function zoekStraks(term: string, deel: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => voerZoekUit(term, deel), 300);
  }

  function open() {
    setUitkomst(null);
    venster.current?.showModal();
    if (resultaten === null) voerZoekUit(zoek, onderdeel);
  }

  function kies(b: GevondenBeeld) {
    if (aanwezig.includes(b.id) && !window.confirm(`Beeld ${b.code} staat al in deze sectie. Nog een keer toevoegen?`)) {
      return;
    }
    startToevoegen(async () => {
      setUitkomst(await voegBeeldToe(sleutel, sectieId, b.id));
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="flex h-full min-h-32 w-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-black/25 text-sm text-black/60 hover:border-accent hover:text-accent dark:border-white/25 dark:text-white/60"
      >
        <span className="text-2xl leading-none">+</span>
        Beeld toevoegen
      </button>

      <dialog
        ref={venster}
        className="m-auto w-[min(56rem,calc(100vw-2rem))] rounded-2xl bg-background p-0 text-foreground backdrop:bg-black/40"
      >
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex flex-col gap-3 border-b border-black/10 p-5 dark:border-white/15">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Beeld kiezen voor &lsquo;{kop}&rsquo;</h2>
                <p className="text-sm text-black/60 dark:text-white/60">
                  Je kiest uit de centrale beeldbank. Het beeld komt achteraan in deze sectie. Je kunt
                  meerdere beelden na elkaar toevoegen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => venster.current?.close()}
                className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:opacity-90"
              >
                Klaar
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={zoek}
                autoFocus
                onChange={(e) => {
                  setZoek(e.target.value);
                  zoekStraks(e.target.value, onderdeel);
                }}
                placeholder="Zoek op nummer (B0123), naam of omschrijving"
                className="flex-1 rounded-lg border border-black/15 bg-kaart px-3 py-2 outline-none focus:border-accent dark:border-white/20"
              />
              <select
                value={onderdeel}
                onChange={(e) => {
                  setOnderdeel(e.target.value);
                  voerZoekUit(zoek, e.target.value);
                }}
                className="rounded-lg border border-black/15 bg-kaart px-3 py-2 dark:border-white/20"
              >
                <option value="">Alle onderdelen</option>
                {ONDERDELEN.map((o) => (
                  <option key={o} value={o}>
                    {o.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </div>
            {uitkomst && (
              <p
                role={uitkomst.ok ? "status" : "alert"}
                className={`text-sm ${uitkomst.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
              >
                {uitkomst.ok ? "✓ " : ""}
                {uitkomst.melding}
              </p>
            )}
          </div>

          <div className="overflow-y-auto p-5">
            {resultaten === null || (zoekt && resultaten.length === 0) ? (
              <p className="text-sm text-black/50 dark:text-white/50">Zoeken…</p>
            ) : resultaten.length === 0 ? (
              <p className="text-sm text-black/50 dark:text-white/50">
                Geen beelden gevonden. Probeer een ander woord of kies &lsquo;Alle onderdelen&rsquo;.
              </p>
            ) : (
              <>
                <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${zoekt ? "opacity-60" : ""}`}>
                  {resultaten.map((b) => {
                    const alGekozen = aanwezig.includes(b.id);
                    return (
                      <li
                        key={b.id}
                        className="flex flex-col gap-1.5 rounded-xl border border-black/10 bg-kaart p-2 dark:border-white/15"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-white">
                          {b.url ? (
                            <img src={b.url} alt={b.naam ?? b.code} loading="lazy" className="max-h-full max-w-full object-contain" />
                          ) : (
                            <span className="text-xs text-black/40">geen voorbeeld</span>
                          )}
                        </div>
                        <p className="text-xs">
                          <span className="font-medium">{b.code}</span>
                          {b.naam && <span className="block break-all text-black/60 dark:text-white/60">{b.naam}</span>}
                        </p>
                        {(b.omschrijving || b.bijschrift) && (
                          <p className="line-clamp-2 text-xs text-black/50 dark:text-white/50">
                            {b.omschrijving || b.bijschrift}
                          </p>
                        )}
                        <button
                          type="button"
                          disabled={toevoegen}
                          onClick={() => kies(b)}
                          className={`mt-auto rounded-full px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                            alGekozen
                              ? "border border-black/15 text-black/60 dark:border-white/20 dark:text-white/60"
                              : "bg-accent text-white hover:opacity-90"
                          }`}
                        >
                          {alGekozen ? "Staat er al · nogmaals" : "Toevoegen"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {resultaten.length === 24 && (
                  <p className="mt-3 text-xs text-black/50 dark:text-white/50">
                    De eerste 24 resultaten worden getoond. Zoek specifieker om andere beelden te vinden.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
