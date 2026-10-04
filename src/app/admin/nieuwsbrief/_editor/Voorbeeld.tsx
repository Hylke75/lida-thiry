"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { ontvangerVariabelen, renderNieuwsbrief, valideerBlokken, type Blok } from "@/lib/nieuwsbrief/blokken";
import { vulIn } from "@/lib/inhoud/schema";
import { zacht } from "./stijl";

const VOORBEELD_ONTVANGER = { naam: "Anna de Vries", email: "anna@voorbeeld.nl" };

/** Live voorbeeld van de mail, zoals een ontvanger (Anna) hem ziet. */
export function Voorbeeld({
  onderwerp,
  preheader,
  blokken,
  afzender,
}: {
  onderwerp: string;
  preheader: string;
  blokken: Blok[];
  afzender: { naam: string; adres: string | null };
}) {
  const [breedte, setBreedte] = useState<"computer" | "telefoon">("computer");
  const invoer = {
    onderwerp: useDeferredValue(onderwerp),
    preheader: useDeferredValue(preheader),
    blokken: useDeferredValue(blokken),
  };
  const mail = useMemo(() => {
    const r = renderNieuwsbrief({
      onderwerp: invoer.onderwerp,
      preheader: invoer.preheader,
      // Zelfde opschoning als bij verzenden, zodat het voorbeeld klopt.
      blokken: valideerBlokken(invoer.blokken).blokken,
      ontvanger: VOORBEELD_ONTVANGER,
      afmeldUrl: "#",
      afzender,
    });
    // Links in het voorbeeld niet laten openen in het kader.
    return {
      onderwerp: r.onderwerp,
      preheader: vulIn(invoer.preheader, ontvangerVariabelen(VOORBEELD_ONTVANGER)),
      html: r.html.replace("<head>", '<head><base target="_blank">'),
    };
  }, [invoer.onderwerp, invoer.preheader, invoer.blokken, afzender]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Voorbeeld</h2>
        <div role="group" aria-label="Breedte van het voorbeeld" className="flex rounded-full border border-black/15 p-0.5 text-xs dark:border-white/20">
          {(["computer", "telefoon"] as const).map((b) => (
            <button
              key={b}
              type="button"
              aria-pressed={breedte === b}
              onClick={() => setBreedte(b)}
              className={`rounded-full px-3 py-1 ${breedte === b ? "bg-accent text-white" : "hover:bg-black/5 dark:hover:bg-white/5"}`}
            >
              {b === "computer" ? "Computer" : "Telefoon"}
            </button>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-black/10 bg-black/[0.02] px-3 py-2 text-sm dark:border-white/15 dark:bg-white/5">
        <p className="truncate font-medium">{mail.onderwerp || <span className={zacht}>(nog geen onderwerp)</span>}</p>
        <p className={`truncate text-xs ${zacht}`}>{mail.preheader || "Geen voorvertoningstekst"}</p>
      </div>
      <div className="flex justify-center overflow-hidden rounded-xl border border-black/10 bg-[#f6f2ee] dark:border-white/15">
        <iframe
          title="Voorbeeld van de mail"
          srcDoc={mail.html}
          sandbox="allow-popups allow-popups-to-escape-sandbox"
          className="h-[70vh] min-h-[420px] w-full border-0 bg-white transition-[max-width] duration-200"
          style={{ maxWidth: breedte === "telefoon" ? 375 : "100%" }}
        />
      </div>
      <p className={`text-xs ${zacht}`}>
        Zo ziet {VOORBEELD_ONTVANGER.naam} de mail. Persoonlijke velden zoals <code>{"{voornaam}"}</code> worden per ontvanger ingevuld. De afmeldlink werkt alleen in de echte mail.
      </p>
    </div>
  );
}
