"use client";

import { useEffect, useState, useTransition } from "react";
import { Melding } from "../../Melding";
import { slaSeoPaginasOp } from "../acties";
import {
  MAX_SEO_OMSCHRIJVING,
  MAX_SEO_TITEL,
  VASTE_PAGINAS,
  type SeoPaginas,
  type VastePagina,
  type VastePaginaSleutel,
} from "@/lib/website/seo";
import { ADVIES_OMSCHRIJVING } from "@/lib/website/instellingen";
import { invoerBreed, kaart, knop, tekstUitleg } from "@/components/admin/stijl";

interface Regel {
  titel: string;
  omschrijving: string;
  nietIndexeren: boolean;
  sitemap: boolean;
}
type Waarden = Record<VastePaginaSleutel, Regel>;

const PAGINAS = VASTE_PAGINAS as readonly VastePagina[];

function naarWaarden(s: SeoPaginas): Waarden {
  return Object.fromEntries(
    PAGINAS.map((p) => {
      const o = s[p.sleutel as VastePaginaSleutel] ?? {};
      return [
        p.sleutel,
        {
          titel: o.titel ?? "",
          omschrijving: o.omschrijving ?? "",
          nietIndexeren: o.nietIndexeren === true,
          sitemap: o.sitemap ?? p.sitemap,
        },
      ];
    }),
  ) as Waarden;
}

export function SeoFormulier({ begin, siteNaam }: { begin: SeoPaginas; siteNaam: string }) {
  const [w, setW] = useState<Waarden>(() => naarWaarden(begin));
  const [gewijzigd, setGewijzigd] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [bezig, start] = useTransition();

  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  const zet = (sleutel: VastePaginaSleutel, wijziging: Partial<Regel>) => {
    setW((oud) => ({ ...oud, [sleutel]: { ...oud[sleutel], ...wijziging } }));
    setGewijzigd(true);
    setMelding(null);
  };

  const opslaan = () =>
    start(async () => {
      const r = await slaSeoPaginasOp(w);
      if (r.ok) {
        setW(naarWaarden(r.waarde));
        setGewijzigd(false);
        setMelding({ soort: "ok", tekst: [r.bericht] });
      } else {
        setMelding({ soort: "fout", tekst: r.fouten });
      }
    });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        opslaan();
      }}
      className="flex flex-col gap-6"
    >
      {PAGINAS.map((p) => {
        const s = p.sleutel as VastePaginaSleutel;
        const r = w[s];
        const id = `seo-${p.sleutel}`;
        const omsLengte = r.omschrijving.trim().length;
        const vast = Boolean(p.altijdNietIndexeren);
        return (
          <section key={p.sleutel} className={kaart} aria-labelledby={`${id}-kop`}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <h2 id={`${id}-kop`} className="text-lg font-semibold">
                {p.naam}
              </h2>
              <span className="font-mono text-xs text-foreground/70">{p.pad}</span>
            </div>
            {p.uitleg && <p className={tekstUitleg}>{p.uitleg}</p>}
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`${id}-titel`} className="text-sm font-medium">
                Titel
              </label>
              <input
                id={`${id}-titel`}
                value={r.titel}
                maxLength={MAX_SEO_TITEL}
                placeholder={p.titel ?? "Blog: (titel van het blogoverzicht)"}
                onChange={(e) => zet(s, { titel: e.target.value })}
                aria-describedby={`${id}-titel-uitleg`}
                className={invoerBreed}
              />
              <p id={`${id}-titel-uitleg`} className={tekstUitleg}>
                In het tabblad en in Google: &lsquo;{r.titel.trim() || p.titel || "Blog: …"} · {siteNaam}&rsquo;.
              </p>
            </div>
            {!vast && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${id}-omschrijving`} className="text-sm font-medium">
                  Omschrijving voor zoekmachines
                </label>
                <textarea
                  id={`${id}-omschrijving`}
                  value={r.omschrijving}
                  maxLength={MAX_SEO_OMSCHRIJVING}
                  rows={2}
                  placeholder={p.omschrijving ?? "De introductie van het blogoverzicht (Teksten → Blog)"}
                  onChange={(e) => zet(s, { omschrijving: e.target.value })}
                  aria-describedby={`${id}-omschrijving-uitleg`}
                  className={invoerBreed}
                />
                <p id={`${id}-omschrijving-uitleg`} className={tekstUitleg}>
                  Google toont ongeveer {ADVIES_OMSCHRIJVING.max} tekens.
                  {omsLengte > 0 && ` Nu ${omsLengte} tekens.`}
                </p>
              </div>
            )}
            {vast ? (
              <p className={tekstUitleg}>Staat nooit in zoekmachines of in de sitemap.</p>
            ) : (
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.nietIndexeren}
                    onChange={(e) => zet(s, { nietIndexeren: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>Niet indexeren (deze pagina niet in zoekmachines)</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.sitemap && !r.nietIndexeren}
                    disabled={r.nietIndexeren}
                    onChange={(e) => zet(s, { sitemap: e.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
                  />
                  <span>
                    In de sitemap
                    {r.nietIndexeren && <span className="text-foreground/70"> (niet bij &lsquo;niet indexeren&rsquo;)</span>}
                  </span>
                </label>
              </div>
            )}
          </section>
        );
      })}

      {melding && (
        <Melding soort={melding.soort}>
          {melding.soort === "fout" && <span className="block font-medium">Niet opgeslagen. Controleer het volgende:</span>}
          {melding.tekst.map((t) => (
            <span key={t} className="block">
              {melding.soort === "fout" ? `• ${t}` : t}
            </span>
          ))}
        </Melding>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 bg-background/90 px-1 py-3 backdrop-blur">
        <button disabled={bezig} className={knop}>
          {bezig ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        {gewijzigd && !bezig && <span className="text-xs text-foreground/70">Niet-opgeslagen wijzigingen</span>}
      </div>
    </form>
  );
}
