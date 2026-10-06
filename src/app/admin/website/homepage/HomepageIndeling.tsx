"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Melding } from "../../Melding";
import { slaIndelingOp } from "../acties";
import {
  BLOK_INFO,
  isStandaardIndeling,
  standaardIndeling,
  verschuifBlok,
  zetZichtbaar,
  type IndelingItem,
} from "@/lib/website/homepage";
import { knop, knopSecundair } from "@/components/admin/stijl";

const KNOP =
  "flex h-9 w-9 items-center justify-center rounded-full border border-black/15 text-base hover:border-accent/40 disabled:cursor-not-allowed disabled:opacity-30 dark:border-white/20";

export function HomepageIndeling({ begin }: { begin: IndelingItem[] }) {
  const [indeling, setIndeling] = useState(begin);
  const [gewijzigd, setGewijzigd] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [bezig, start] = useTransition();

  const wijzig = (nieuw: IndelingItem[]) => {
    setIndeling(nieuw);
    setGewijzigd(true);
    setMelding(null);
  };

  const opslaan = () =>
    start(async () => {
      const r = await slaIndelingOp(indeling);
      if (r.ok) {
        setIndeling(r.indeling);
        setGewijzigd(false);
        setMelding({ soort: "ok", tekst: [r.bericht] });
      } else {
        setMelding({ soort: "fout", tekst: r.fouten });
      }
    });

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-col gap-2">
        {indeling.map((item, i) => {
          const info = BLOK_INFO[item.blok];
          const vast = item.blok === "hero";
          const id = `zichtbaar-${item.blok}`;
          return (
            <li
              key={item.blok}
              className={`flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:flex-row sm:items-center dark:border-white/15 ${
                item.zichtbaar ? "" : "opacity-60"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-zacht text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">{info.naam}</span>
                  {info.uitleg && <span className="text-xs text-foreground/70">{info.uitleg}</span>}
                  <Link href={info.tekstenHref} className="w-fit text-xs text-accent underline underline-offset-4">
                    Teksten bewerken
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:shrink-0">
                <label
                  htmlFor={id}
                  className={`flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 text-sm dark:border-white/15 ${
                    vast ? "cursor-not-allowed" : "cursor-pointer"
                  }`}
                >
                  <input
                    id={id}
                    type="checkbox"
                    checked={item.zichtbaar}
                    disabled={vast}
                    onChange={(e) => wijzig(zetZichtbaar(indeling, item.blok, e.target.checked))}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  Zichtbaar
                </label>
                <button
                  type="button"
                  className={KNOP}
                  disabled={vast || i <= 1}
                  onClick={() => wijzig(verschuifBlok(indeling, item.blok, "omhoog"))}
                  aria-label={`${info.naam} omhoog`}
                  title="Omhoog"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={KNOP}
                  disabled={vast || i === indeling.length - 1}
                  onClick={() => wijzig(verschuifBlok(indeling, item.blok, "omlaag"))}
                  aria-label={`${info.naam} omlaag`}
                  title="Omlaag"
                >
                  ↓
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      {melding && (
        <Melding soort={melding.soort}>
          {melding.tekst.map((t) => (
            <span key={t} className="block">
              {t}
            </span>
          ))}
        </Melding>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig || !gewijzigd}
          className={knop}
        >
          {bezig ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        <button
          type="button"
          onClick={() => wijzig(standaardIndeling())}
          disabled={bezig || isStandaardIndeling(indeling)}
          className={knopSecundair}
        >
          Standaardvolgorde
        </button>
        <a href="/" target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline underline-offset-4">
          Bekijk de homepage ↗
        </a>
        {gewijzigd && !bezig && <span className="text-xs text-foreground/70">Niet-opgeslagen wijzigingen</span>}
      </div>
    </div>
  );
}
