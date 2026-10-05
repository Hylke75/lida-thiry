"use client";

import { useEffect, useState } from "react";
import { compacteer, telVerschil, type DiffRegel } from "@/lib/versies/diff";
import type { VersieMeta, VersieSoort } from "@/lib/versies/regels";
import { Melding } from "../Melding";
import { haalVersies, vergelijkVersie } from "./acties";
import { TIJDZONE } from "@/lib/datum";

const knop =
  "rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-40 dark:border-white/20 dark:hover:bg-white/5";
const zacht = "text-black/55 dark:text-white/55";

const datumTijd = new Intl.DateTimeFormat("nl-NL", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: TIJDZONE,
});

function Regel({ r }: { r: DiffRegel }) {
  const stijl =
    r.soort === "erbij"
      ? "bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100"
      : r.soort === "weg"
        ? "bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100"
        : "";
  const markeer = r.soort === "erbij" ? "bg-emerald-200 dark:bg-emerald-800" : "bg-red-200 dark:bg-red-800";
  return (
    <div className={`flex gap-2 px-2 ${stijl}`}>
      <span aria-hidden className="w-3 shrink-0 select-none opacity-60">
        {r.soort === "erbij" ? "+" : r.soort === "weg" ? "−" : " "}
      </span>
      <span className="sr-only">{r.soort === "erbij" ? "In deze versie: " : r.soort === "weg" ? "Nu: " : ""}</span>
      <span className="min-w-0 whitespace-pre-wrap break-words">
        {r.delen
          ? r.delen.map((d, i) =>
              d.gewijzigd ? (
                <mark key={i} className={`rounded-sm text-inherit ${markeer}`}>
                  {d.tekst}
                </mark>
              ) : (
                <span key={i}>{d.tekst}</span>
              ),
            )
          : r.tekst || " "}
      </span>
    </div>
  );
}

function Vergelijking({ regels }: { regels: DiffRegel[] }) {
  const { erbij, weg } = telVerschil(regels);
  if (!erbij && !weg) return <p className={`text-sm ${zacht}`}>Deze versie is gelijk aan wat er nu is opgeslagen.</p>;
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className={`text-xs ${zacht}`}>
        <span className="rounded bg-red-50 px-1 text-red-900 dark:bg-red-950/40 dark:text-red-200">− rood</span> = staat er nu (verdwijnt bij terugzetten),{" "}
        <span className="rounded bg-emerald-50 px-1 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">+ groen</span> = in deze versie. {weg}{" "}
        regel(s) weg, {erbij} regel(s) erbij.
      </p>
      <div className="max-h-[50vh] min-w-0 overflow-auto rounded-lg border border-black/10 py-1 font-mono text-xs leading-relaxed dark:border-white/15">
        {compacteer(regels).map((r, i) =>
          r.soort === "overslag" ? (
            <div key={i} className={`px-2 py-0.5 text-center italic ${zacht}`}>
              … {r.aantal} ongewijzigde regel{r.aantal === 1 ? "" : "s"} …
            </div>
          ) : (
            <Regel key={i} r={r} />
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Knop "Geschiedenis" met een zijpaneel: eerdere versies, een vergelijking met
 * wat er nu is opgeslagen en "Deze versie terugzetten". Het terugzetten zelf
 * doet de editor (`onTerugzetten`), zodat die zijn eigen velden kan bijwerken;
 * geeft null bij succes, anders de foutmeldingen.
 */
export function Geschiedenis({
  soort,
  refId,
  onTerugzetten,
  gewijzigd = false,
  knopKlasse = knop,
  knopTekst = "Geschiedenis",
}: {
  soort: VersieSoort;
  refId: string;
  onTerugzetten: (versieId: string) => Promise<string[] | null>;
  gewijzigd?: boolean;
  knopKlasse?: string;
  knopTekst?: string;
}) {
  const [open, setOpen] = useState(false);
  const [versies, setVersies] = useState<VersieMeta[] | null>(null);
  const [gekozen, setGekozen] = useState<string | null>(null);
  const [regels, setRegels] = useState<DiffRegel[] | null>(null);
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);

  async function laad() {
    setVersies(null);
    setGekozen(null);
    setRegels(null);
    const r = await haalVersies(soort, refId).catch(() => null);
    if (!r || !r.ok) {
      setVersies([]);
      setMelding({ soort: "fout", tekst: r ? r.fouten : ["De geschiedenis kon niet worden geladen."] });
      return;
    }
    setVersies(r.versies);
  }

  function openen() {
    setOpen(true);
    setMelding(null);
    void laad();
  }

  useEffect(() => {
    if (!open) return;
    const sluit = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", sluit);
    return () => window.removeEventListener("keydown", sluit);
  }, [open]);

  async function kies(id: string) {
    if (gekozen === id) {
      setGekozen(null);
      return;
    }
    setGekozen(id);
    setRegels(null);
    const r = await vergelijkVersie(id).catch(() => null);
    if (!r || !r.ok) {
      setMelding({ soort: "fout", tekst: r ? r.fouten : ["De vergelijking kon niet worden gemaakt."] });
      return;
    }
    setRegels(r.regels);
  }

  async function terugzetten(v: VersieMeta) {
    const vraag = [
      `De versie van ${datumTijd.format(new Date(v.op))} terugzetten?`,
      "De huidige inhoud wordt eerst in de geschiedenis bewaard, dus je kunt dit ongedaan maken.",
      gewijzigd ? "Let op: je wijzigingen die nog niet zijn opgeslagen, gaan verloren." : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!confirm(vraag)) return;
    setBezig(true);
    setMelding(null);
    try {
      const fouten = await onTerugzetten(v.id);
      if (fouten) {
        setMelding({ soort: "fout", tekst: fouten });
      } else {
        setOpen(false);
      }
    } catch {
      setMelding({ soort: "fout", tekst: ["Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw."] });
    } finally {
      setBezig(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openen} className={knopKlasse} title="Eerdere versies bekijken en terugzetten">
        {knopTekst}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="geschiedenis-titel"
            className="flex h-full w-full max-w-2xl min-w-0 flex-col gap-4 overflow-y-auto bg-background p-4 shadow-xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 id="geschiedenis-titel" className="text-lg font-semibold">
                Geschiedenis
              </h2>
              <button type="button" onClick={() => setOpen(false)} className={knop}>
                Sluiten
              </button>
            </div>
            <p className={`text-sm ${zacht}`}>
              Bij elke keer opslaan wordt de vorige inhoud bewaard (de laatste 50 versies; snel na elkaar opslaan telt als één keer). Kies een versie om
              te zien wat er anders is dan nu.
            </p>
            {melding && (
              <Melding soort={melding.soort}>
                {melding.tekst.map((t, i) => (
                  <span key={i} className="block">
                    {t}
                  </span>
                ))}
              </Melding>
            )}
            {versies === null ? (
              <p className={`text-sm ${zacht}`}>Laden…</p>
            ) : versies.length === 0 ? (
              <p className={`text-sm ${zacht}`}>Er zijn nog geen eerdere versies. Die verschijnen hier zodra je wijzigingen opslaat.</p>
            ) : (
              <ul className="flex min-w-0 flex-col gap-2">
                {versies.map((v) => (
                  <li key={v.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-black/10 p-3 dark:border-white/15">
                    <button type="button" onClick={() => void kies(v.id)} aria-expanded={gekozen === v.id} className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-left">
                      <span className="font-medium">{datumTijd.format(new Date(v.op))}</span>
                      <span className={`min-w-0 text-sm ${zacht}`}>
                        {v.omschrijving || "Opgeslagen"}
                        {v.gemaakt_door ? ` · ${v.gemaakt_door}` : ""}
                      </span>
                    </button>
                    {gekozen === v.id && (
                      <div className="flex min-w-0 flex-col gap-3">
                        {regels === null ? <p className={`text-sm ${zacht}`}>Vergelijken…</p> : <Vergelijking regels={regels} />}
                        <button
                          type="button"
                          onClick={() => void terugzetten(v)}
                          disabled={bezig}
                          className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
                        >
                          {bezig ? "Bezig…" : "Deze versie terugzetten"}
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
