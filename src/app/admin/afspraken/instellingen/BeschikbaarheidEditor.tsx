"use client";

import { useState } from "react";
import { WEEKDAGEN } from "@/lib/afspraken/regels";

interface Blok {
  sleutel: number;
  weekdag: number;
  van: string;
  tot: string;
}

const invoer =
  "rounded-lg border border-black/15 bg-transparent px-2 py-1.5 text-sm tabular-nums outline-none focus:border-accent dark:border-white/20";
const klein =
  "rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5";

let teller = 0;
const nieuweSleutel = () => ++teller;

/**
 * Weekplanning: per dag nul of meer tijdblokken (bijv. 09:00–12:00 en
 * 13:00–17:00). Wordt als JSON in één verborgen veld naar de server gestuurd;
 * de server controleert alles opnieuw (overlap, van < tot).
 */
export function BeschikbaarheidEditor({
  begin,
  actie,
}: {
  begin: readonly { weekdag: number; van: string; tot: string }[];
  actie: (fd: FormData) => Promise<void>;
}) {
  const [blokken, setBlokken] = useState<Blok[]>(() =>
    begin.map((b) => ({ sleutel: nieuweSleutel(), weekdag: b.weekdag, van: b.van.slice(0, 5), tot: b.tot.slice(0, 5) })),
  );

  const wijzig = (sleutel: number, veld: "van" | "tot", waarde: string) =>
    setBlokken((bs) => bs.map((b) => (b.sleutel === sleutel ? { ...b, [veld]: waarde } : b)));
  const verwijder = (sleutel: number) => setBlokken((bs) => bs.filter((b) => b.sleutel !== sleutel));
  const voegToe = (weekdag: number) =>
    setBlokken((bs) => {
      const vandaag = bs.filter((b) => b.weekdag === weekdag).sort((a, b) => a.tot.localeCompare(b.tot));
      const laatste = vandaag.at(-1);
      const van = laatste ? laatste.tot : "09:00";
      const uur = Math.min(23, Number(van.slice(0, 2)) + 3);
      const tot = laatste ? `${String(uur).padStart(2, "0")}:${van.slice(3)}` : "17:00";
      return [...bs, { sleutel: nieuweSleutel(), weekdag, van, tot: tot > van ? tot : "23:59" }];
    });
  const kopieerNaarWerkdagen = (weekdag: number) =>
    setBlokken((bs) => {
      const bron = bs.filter((b) => b.weekdag === weekdag);
      const rest = bs.filter((b) => b.weekdag > 5 || b.weekdag === weekdag);
      const kopie = [1, 2, 3, 4, 5]
        .filter((d) => d !== weekdag)
        .flatMap((d) => bron.map((b) => ({ ...b, sleutel: nieuweSleutel(), weekdag: d })));
      return [...rest, ...kopie];
    });

  const json = JSON.stringify(blokken.map(({ weekdag, van, tot }) => ({ weekdag, van, tot })));

  return (
    <form action={actie} className="flex flex-col gap-3">
      <input type="hidden" name="blokken" value={json} />
      <ul className="flex flex-col divide-y divide-black/10 dark:divide-white/10">
        {WEEKDAGEN.map((naam, i) => {
          const weekdag = i + 1;
          const vandaag = blokken.filter((b) => b.weekdag === weekdag);
          return (
            <li key={naam} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:gap-4">
              <span className="w-28 shrink-0 pt-1.5 text-sm font-medium capitalize">{naam}</span>
              <div className="flex flex-1 flex-col gap-2">
                {vandaag.length === 0 && <span className="pt-1.5 text-sm text-black/50 dark:text-white/50">Niet beschikbaar</span>}
                {vandaag.map((b) => (
                  <div key={b.sleutel} className="flex flex-wrap items-center gap-2">
                    <input
                      type="time"
                      value={b.van}
                      step={900}
                      onChange={(e) => wijzig(b.sleutel, "van", e.currentTarget.value)}
                      aria-label={`${naam}: begintijd`}
                      className={invoer}
                    />
                    <span aria-hidden="true">–</span>
                    <input
                      type="time"
                      value={b.tot}
                      step={900}
                      onChange={(e) => wijzig(b.sleutel, "tot", e.currentTarget.value)}
                      aria-label={`${naam}: eindtijd`}
                      className={invoer}
                    />
                    <button type="button" onClick={() => verwijder(b.sleutel)} className={klein} aria-label={`${naam}: blok verwijderen`}>
                      Verwijderen
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => voegToe(weekdag)} className={klein}>
                    + Tijdblok
                  </button>
                  {weekdag <= 5 && vandaag.length > 0 && (
                    <button type="button" onClick={() => kopieerNaarWerkdagen(weekdag)} className={klein}>
                      Kopieer naar alle werkdagen
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <button className="w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90">
        Beschikbaarheid opslaan
      </button>
    </form>
  );
}
