"use client";

import { BLOK_SOORTEN, MAX_BLOKKEN, nieuwBlok, type Blok, type BlokSoort } from "@/lib/nieuwsbrief/blokken";
import { AfbeeldingUpload } from "./AfbeeldingUpload";
import { invoerKlasse, knopKlein, zacht } from "./stijl";

const SOORT_LABEL = Object.fromEntries(BLOK_SOORTEN.map((s) => [s.soort, s.label])) as Record<BlokSoort, string>;

const SOORT_UITLEG: Partial<Record<BlokSoort, string>> = {
  scheiding: "Een dunne lijn om onderdelen van elkaar te scheiden.",
  ruimte: "Wat extra witruimte tussen twee onderdelen.",
};

function Veld({ id, label, children, uitleg }: { id: string; label: string; children: React.ReactNode; uitleg?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-black/70 dark:text-white/70">
        {label}
      </label>
      {children}
      {uitleg && <p className={`text-xs ${zacht}`}>{uitleg}</p>}
    </div>
  );
}

function BlokVelden({ blok, onChange }: { blok: Blok; onChange: (b: Blok) => void }) {
  const id = `blok-${blok.id}`;
  switch (blok.soort) {
    case "kop":
      return (
        <Veld id={id} label="Koptekst">
          <input id={id} value={blok.tekst} maxLength={200} onChange={(e) => onChange({ ...blok, tekst: e.target.value })} className={invoerKlasse} />
        </Veld>
      );
    case "tekst":
      return (
        <Veld
          id={id}
          label="Tekst"
          uitleg={
            <>
              Opmaak: <code>## Tussenkop</code> · <code>- opsomming</code> · <code>**vet**</code> ·{" "}
              <code>[linktekst](https://…)</code> · <code>{"{voornaam}"}</code> · lege regel = nieuwe alinea
            </>
          }
        >
          <textarea
            id={id}
            value={blok.tekst}
            rows={Math.min(14, Math.max(4, blok.tekst.split("\n").length + 1))}
            onChange={(e) => onChange({ ...blok, tekst: e.target.value })}
            className={`${invoerKlasse} font-mono text-[13px] leading-relaxed`}
          />
        </Veld>
      );
    case "afbeelding":
      return (
        <div className="flex flex-col gap-3">
          {blok.url && /^https:\/\//i.test(blok.url) && (
            // eslint-disable-next-line @next/next/no-img-element -- willekeurige externe URL, alleen als voorbeeld
            <img src={blok.url} alt={blok.alt} className="max-h-40 w-auto max-w-full self-start rounded-lg border border-black/10 object-contain dark:border-white/15" />
          )}
          <AfbeeldingUpload heeftAfbeelding={Boolean(blok.url)} onUrl={(url) => onChange({ ...blok, url })} />
          <Veld id={`${id}-url`} label="Of plak het adres van een afbeelding" uitleg="Moet beginnen met https://">
            <input
              id={`${id}-url`}
              type="url"
              inputMode="url"
              value={blok.url}
              placeholder="https://…"
              onChange={(e) => onChange({ ...blok, url: e.target.value })}
              className={invoerKlasse}
            />
          </Veld>
          <Veld id={`${id}-alt`} label="Korte omschrijving (verplicht)" uitleg="Voor wie afbeeldingen niet ziet of een schermlezer gebruikt.">
            <input id={`${id}-alt`} value={blok.alt} maxLength={300} onChange={(e) => onChange({ ...blok, alt: e.target.value })} className={invoerKlasse} />
          </Veld>
          <Veld id={`${id}-link`} label="Link bij klikken (optioneel)">
            <input
              id={`${id}-link`}
              type="url"
              inputMode="url"
              value={blok.link}
              placeholder="https://…"
              onChange={(e) => onChange({ ...blok, link: e.target.value })}
              className={invoerKlasse}
            />
          </Veld>
        </div>
      );
    case "knop":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Veld id={`${id}-tekst`} label="Tekst op de knop">
            <input id={`${id}-tekst`} value={blok.tekst} maxLength={80} onChange={(e) => onChange({ ...blok, tekst: e.target.value })} className={invoerKlasse} />
          </Veld>
          <Veld id={`${id}-url`} label="Link">
            <input
              id={`${id}-url`}
              type="url"
              inputMode="url"
              value={blok.url}
              placeholder="https://…"
              onChange={(e) => onChange({ ...blok, url: e.target.value })}
              className={invoerKlasse}
            />
          </Veld>
        </div>
      );
    default:
      return <p className={`text-xs ${zacht}`}>{SOORT_UITLEG[blok.soort]}</p>;
  }
}

/** Lijst met blokken: toevoegen, aanpassen, verplaatsen, dupliceren en verwijderen. */
export function BlokEditor({ blokken, onChange }: { blokken: Blok[]; onChange: (b: Blok[]) => void }) {
  const wijzig = (i: number, b: Blok) => onChange(blokken.map((x, j) => (j === i ? b : x)));
  const verplaats = (i: number, r: -1 | 1) => {
    const nieuw = [...blokken];
    [nieuw[i], nieuw[i + r]] = [nieuw[i + r], nieuw[i]];
    onChange(nieuw);
  };
  const dupliceer = (i: number) => {
    const kopie = { ...blokken[i], id: nieuwBlok(blokken[i].soort).id } as Blok;
    onChange([...blokken.slice(0, i + 1), kopie, ...blokken.slice(i + 1)]);
  };
  const verwijder = (i: number) => {
    const b = blokken[i];
    const heeftInhoud = ("tekst" in b && b.tekst.trim()) || ("url" in b && b.url.trim());
    if (heeftInhoud && !confirm(`Dit blok (${SOORT_LABEL[b.soort].toLowerCase()}) verwijderen?`)) return;
    onChange(blokken.filter((_, j) => j !== i));
  };
  const vol = blokken.length >= MAX_BLOKKEN;

  return (
    <div className="flex flex-col gap-3">
      {blokken.length === 0 && (
        <p className={`rounded-lg border border-dashed border-black/15 px-4 py-3 text-sm dark:border-white/20 ${zacht}`}>
          De mail is nog leeg. Begin bijvoorbeeld met een kop en een tekst.
        </p>
      )}
      {blokken.map((b, i) => (
        <fieldset key={b.id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-black/10 p-3 sm:p-4 dark:border-white/15">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
              {i + 1}. {SOORT_LABEL[b.soort]}
            </legend>
            <div className="flex flex-wrap gap-1">
              <button type="button" onClick={() => verplaats(i, -1)} disabled={i === 0} className={knopKlein} aria-label={`Blok ${i + 1} omhoog`}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => verplaats(i, 1)}
                disabled={i === blokken.length - 1}
                className={knopKlein}
                aria-label={`Blok ${i + 1} omlaag`}
              >
                ↓
              </button>
              <button type="button" onClick={() => dupliceer(i)} disabled={vol} className={knopKlein}>
                Dupliceren
              </button>
              <button type="button" onClick={() => verwijder(i)} className={`${knopKlein} text-red-700 dark:text-red-300`}>
                Verwijderen
              </button>
            </div>
          </div>
          <BlokVelden blok={b} onChange={(nieuw) => wijzig(i, nieuw)} />
        </fieldset>
      ))}
      <div className="flex flex-col gap-2 rounded-xl bg-black/[0.03] p-3 dark:bg-white/5">
        <span className={`text-xs ${zacht}`}>{vol ? `Je hebt het maximum van ${MAX_BLOKKEN} blokken bereikt.` : "Blok toevoegen:"}</span>
        <div className="flex flex-wrap gap-1.5">
          {BLOK_SOORTEN.map((s) => (
            <button
              key={s.soort}
              type="button"
              disabled={vol}
              onClick={() => onChange([...blokken, nieuwBlok(s.soort)])}
              className="rounded-full border border-accent/40 px-3 py-1.5 text-sm text-accent hover:bg-accent-zacht disabled:opacity-40"
            >
              + {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
