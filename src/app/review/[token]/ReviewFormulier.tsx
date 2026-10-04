"use client";

import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { REVIEWS_FORMULIER } from "@/lib/inhoud/groepen/reviews";
import { REVIEW_MAX, REVIEW_MIN_TEKST, valideerReview, type ReviewVeld } from "@/lib/reviews/regels";
import { bewaarReview } from "./acties";

type Teksten = SectieWaarden<typeof REVIEWS_FORMULIER>;

const VOLGORDE: readonly ReviewVeld[] = ["sterren", "tekst", "naam"];

const invoerStijl = (fout: boolean) =>
  `w-full rounded-lg border bg-kaart px-3 py-2 outline-none focus:ring-2 ${
    fout
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "border-foreground/15 focus:border-accent focus:ring-accent/20"
  }`;

const hoofdknop =
  "rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50";

function Ster({ vol }: { vol: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-9 w-9" aria-hidden="true">
      <path
        d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"
        className={vol ? "fill-accent stroke-accent" : "fill-transparent stroke-foreground/30"}
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Het reviewformulier: sterren (een gewone radiogroep, dus met pijltjestoetsen
 * te bedienen), tekst, getoonde naam en toestemming voor publicatie. Na het
 * versturen volgt een bedankje; aanpassen kan zolang de review niet is beoordeeld.
 */
export function ReviewFormulier({
  token,
  teksten,
  begin,
  alIngevuld,
}: {
  token: string;
  teksten: Teksten;
  begin: { sterren: number | null; tekst: string; naam: string; toestemming: boolean };
  alIngevuld: boolean;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [modus, setModus] = useState<"formulier" | "bedankt" | "afgesloten">(alIngevuld ? "bedankt" : "formulier");
  const [ingevuld, setIngevuld] = useState(alIngevuld);
  // De laatst opgeslagen waarden: bij ‘Reactie aanpassen’ staat het formulier daarop.
  const [waarden, setWaarden] = useState(begin);
  const [sterren, setSterren] = useState<number>(begin.sterren ?? 0);
  const [zweef, setZweef] = useState<number>(0);
  const [lengte, setLengte] = useState(begin.tekst.length);
  const [fouten, setFouten] = useState<Partial<Record<ReviewVeld, string>>>({});
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, startTransition] = useTransition();

  const veldId = (v: ReviewVeld) => `${id}-${v}`;
  const foutId = (v: ReviewVeld) => `${id}-${v}-fout`;

  function focusEersteFout(f: Partial<Record<ReviewVeld, string>>) {
    const eerste = VOLGORDE.find((v) => f[v]);
    if (!eerste) return;
    const el =
      eerste === "sterren"
        ? formRef.current?.querySelector<HTMLInputElement>(`input[name="sterren"]${sterren ? ":checked" : ""}`)
        : document.getElementById(veldId(eerste));
    el?.focus();
  }

  function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const invoer = {
      sterren: Number(f.get("sterren") || 0),
      tekst: String(f.get("tekst") || ""),
      naam: String(f.get("naam") || ""),
      toestemming: f.get("toestemming") === "on",
    };
    setFout(null);
    const controle = valideerReview(invoer);
    if (!controle.ok) {
      setFouten(controle.fouten);
      focusEersteFout(controle.fouten);
      return;
    }
    setFouten({});
    const schoon = controle.waarde;
    startTransition(async () => {
      try {
        const uitkomst = await bewaarReview(token, invoer);
        if (uitkomst.ok) {
          setIngevuld(true);
          setWaarden(schoon);
          setLengte(schoon.tekst.length);
          setModus("bedankt");
          window.scrollTo({ top: 0 });
        } else if (uitkomst.afgesloten) {
          setModus("afgesloten");
        } else if (uitkomst.fouten && Object.keys(uitkomst.fouten).length) {
          setFouten(uitkomst.fouten);
          focusEersteFout(uitkomst.fouten);
        } else {
          setFout(teksten.fout);
        }
      } catch {
        setFout(teksten.fout);
      }
    });
  }

  if (modus === "afgesloten") {
    return (
      <div role="status" className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{teksten.afgesloten_titel}</h1>
        <p className="whitespace-pre-line text-foreground/70">{teksten.afgesloten_tekst}</p>
      </div>
    );
  }

  if (modus === "bedankt") {
    return (
      <div role="status" className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{teksten.bedankt_titel}</h1>
        <p className="whitespace-pre-line text-foreground/70">{teksten.bedankt_tekst}</p>
        <p className="text-sm text-foreground/60">{teksten.bewerken_tekst}</p>
        <button
          type="button"
          onClick={() => setModus("formulier")}
          className="rounded-full border border-accent/40 px-6 py-2.5 text-sm font-medium text-accent hover:bg-accent-zacht"
        >
          {teksten.bewerken_knop}
        </button>
      </div>
    );
  }

  const getoond = zweef || sterren;
  const veldFout = (v: ReviewVeld) =>
    fouten[v] ? (
      <span id={foutId(v)} className="text-sm text-red-700 dark:text-red-300">
        {fouten[v]}
      </span>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">{teksten.titel}</h1>
        {teksten.intro && <p className="whitespace-pre-line text-foreground/70">{teksten.intro}</p>}
      </header>
      <form ref={formRef} onSubmit={verstuur} noValidate className="flex flex-col gap-6 text-left">
        <fieldset
          className="flex flex-col gap-2"
          aria-invalid={fouten.sterren ? true : undefined}
          aria-describedby={fouten.sterren ? foutId("sterren") : undefined}
        >
          <legend className="mb-2 text-sm text-foreground/70">
            {teksten.sterren_label}
            <span className="text-accent" aria-hidden="true">
              {" "}
              *
            </span>
          </legend>
          <div className="flex gap-1" onMouseLeave={() => setZweef(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                className="cursor-pointer rounded-md has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent"
                onMouseEnter={() => setZweef(n)}
              >
                <input
                  type="radio"
                  name="sterren"
                  value={n}
                  checked={sterren === n}
                  onChange={() => setSterren(n)}
                  className="sr-only"
                />
                <span className="sr-only">{n === 1 ? "1 ster" : `${n} sterren`}</span>
                <Ster vol={n <= getoond} />
              </label>
            ))}
          </div>
          {veldFout("sterren")}
        </fieldset>

        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={veldId("tekst")} className="text-foreground/70">
            {teksten.tekst_label}
            <span className="text-accent" aria-hidden="true">
              {" "}
              *
            </span>
          </label>
          {teksten.tekst_uitleg && (
            <span id={`${id}-tekst-uitleg`} className="text-foreground/50">
              {teksten.tekst_uitleg}
            </span>
          )}
          <textarea
            id={veldId("tekst")}
            name="tekst"
            rows={6}
            required
            minLength={REVIEW_MIN_TEKST}
            maxLength={REVIEW_MAX.tekst}
            defaultValue={waarden.tekst}
            onChange={(e) => setLengte(e.currentTarget.value.length)}
            aria-invalid={fouten.tekst ? true : undefined}
            aria-describedby={[fouten.tekst ? foutId("tekst") : null, teksten.tekst_uitleg ? `${id}-tekst-uitleg` : null, `${id}-teller`]
              .filter(Boolean)
              .join(" ")}
            className={invoerStijl(!!fouten.tekst)}
          />
          <div className="flex items-start justify-between gap-3">
            {veldFout("tekst") ?? <span />}
            <span id={`${id}-teller`} className="shrink-0 text-xs tabular-nums text-foreground/50">
              {lengte.toLocaleString("nl-NL")} / {REVIEW_MAX.tekst.toLocaleString("nl-NL")}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm">
          <label htmlFor={veldId("naam")} className="text-foreground/70">
            {teksten.naam_label}
            <span className="text-accent" aria-hidden="true">
              {" "}
              *
            </span>
          </label>
          {teksten.naam_uitleg && (
            <span id={`${id}-naam-uitleg`} className="text-foreground/50">
              {teksten.naam_uitleg}
            </span>
          )}
          <input
            id={veldId("naam")}
            name="naam"
            required
            maxLength={REVIEW_MAX.naam}
            defaultValue={waarden.naam}
            autoComplete="off"
            aria-invalid={fouten.naam ? true : undefined}
            aria-describedby={[fouten.naam ? foutId("naam") : null, teksten.naam_uitleg ? `${id}-naam-uitleg` : null]
              .filter(Boolean)
              .join(" ") || undefined}
            className={invoerStijl(!!fouten.naam)}
          />
          {veldFout("naam")}
        </div>

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            name="toestemming"
            defaultChecked={waarden.toestemming}
            className="mt-1 accent-accent"
          />
          <span>{teksten.toestemming}</span>
        </label>

        {fout && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {fout}
          </p>
        )}

        <div className="flex justify-center">
          <button type="submit" disabled={bezig} className={hoofdknop}>
            {bezig ? "Bezig…" : ingevuld ? teksten.knop_bijwerken : teksten.knop}
          </button>
        </div>
      </form>
    </div>
  );
}
