"use client";

import { useEffect, useState } from "react";
import { BRONNEN, BRON_LABEL, beschrijfDoelgroep, type Bron, type Doelgroep } from "@/lib/nieuwsbrief/doelgroep";
import { formulierKeuzes } from "../formulieren/acties";
import type { TypeKeuze } from "./regels";
import { tekstZacht } from "@/components/admin/stijl";

function wissel<T>(lijst: T[] | undefined, waarde: T): T[] {
  const l = lijst ?? [];
  return l.includes(waarde) ? l.filter((x) => x !== waarde) : [...l, waarde];
}

/** Maakt lege onderdelen leeg (geen lege lijsten), zodat de doelgroep netjes blijft. */
function schoon(d: Doelgroep): Doelgroep {
  const uit: Doelgroep = {};
  if (d.tags?.length) {
    uit.tags = d.tags;
    uit.tagsModus = d.tagsModus ?? "een";
  }
  if (d.zonderTags?.length) uit.zonderTags = d.zonderTags;
  if (d.bronnen?.length) uit.bronnen = d.bronnen;
  if (d.figuurtypes?.length) uit.figuurtypes = d.figuurtypes;
  if (d.besteld) uit.besteld = d.besteld;
  if (d.formulieren?.length) uit.formulieren = d.formulieren;
  return uit;
}

function Chip({ aan, onClick, children }: { aan: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={aan}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm ${
        aan
          ? "border-accent bg-accent-zacht font-medium text-accent"
          : "border-black/15 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5"
      }`}
    >
      {aan ? "✓ " : ""}
      {children}
    </button>
  );
}

function Groep({ titel, uitleg, children }: { titel: string; uitleg?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div>
        <p className="text-sm font-medium">{titel}</p>
        {uitleg && <p className={`text-xs ${tekstZacht}`}>{uitleg}</p>}
      </div>
      {children}
    </div>
  );
}

/** Kiest wie de campagne ontvangt, met het aantal ontvangers erbij. */
export function DoelgroepKiezer({
  doelgroep,
  onChange,
  tags,
  typen,
  aantal,
  tellen,
}: {
  doelgroep: Doelgroep;
  onChange: (d: Doelgroep) => void;
  tags: string[];
  typen: TypeKeuze[];
  aantal: number | null;
  tellen: boolean;
}) {
  const zet = (w: Partial<Doelgroep>) => onChange(schoon({ ...doelgroep, ...w }));
  const alleTags = [...new Set([...tags, ...(doelgroep.tags ?? []), ...(doelgroep.zonderTags ?? [])])].sort((a, b) => a.localeCompare(b, "nl"));
  const typeNaam = (l: string) => {
    const t = typen.find((x) => x.letter === l);
    return t ? `${t.naam} (${l})` : l;
  };
  const leeg = Object.keys(doelgroep).length === 0;
  // Aanmeldformulieren (Beheer → Nieuwsbrief → Formulieren) om op te filteren.
  const [formulieren, setFormulieren] = useState<{ id: string; naam: string; actief: boolean }[]>([]);
  useEffect(() => {
    let weg = false;
    formulierKeuzes()
      .then((f) => {
        if (!weg) setFormulieren(f);
      })
      .catch(() => {});
    return () => {
      weg = true;
    };
  }, []);
  const formulierNaam = (id: string) => formulieren.find((f) => f.id === id)?.naam ?? "verwijderd formulier";

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl bg-accent-zacht/60 px-4 py-3 text-sm">
        <p className="font-medium">
          {tellen || aantal === null
            ? "Ontvangers tellen…"
            : aantal === 1
              ? "1 ontvanger"
              : `${aantal.toLocaleString("nl-NL")} ontvangers`}
        </p>
        <p className={`text-xs ${tekstZacht}`}>{beschrijfDoelgroep(doelgroep, typeNaam, formulierNaam)}</p>
      </div>

      <p className={`text-xs ${tekstZacht}`}>
        Alleen contacten die zich hebben aangemeld (en niet afgemeld) ontvangen de nieuwsbrief. Kies hieronder niets om
        iedereen te mailen, of beperk de groep.
      </p>

      <Groep titel="Met tag" uitleg={tags.length ? undefined : "Er zijn nog geen tags. Tags geef je aan contacten bij Contacten."}>
        {alleTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {alleTags.map((t) => (
              <Chip key={t} aan={Boolean(doelgroep.tags?.includes(t))} onClick={() => zet({ tags: wissel(doelgroep.tags, t) })}>
                {t}
              </Chip>
            ))}
          </div>
        )}
        {(doelgroep.tags?.length ?? 0) > 1 && (
          <div className="flex flex-wrap gap-4 text-sm">
            {(["een", "alle"] as const).map((m) => (
              <label key={m} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tagsModus"
                  checked={(doelgroep.tagsModus ?? "een") === m}
                  onChange={() => zet({ tagsModus: m })}
                  className="accent-[var(--accent)]"
                />
                {m === "een" ? "Minstens één van deze tags" : "Al deze tags"}
              </label>
            ))}
          </div>
        )}
      </Groep>

      {alleTags.length > 0 && (
        <Groep titel="Zonder tag" uitleg="Contacten met een van deze tags krijgen de mail niet.">
          <div className="flex flex-wrap gap-1.5">
            {alleTags.map((t) => (
              <Chip key={t} aan={Boolean(doelgroep.zonderTags?.includes(t))} onClick={() => zet({ zonderTags: wissel(doelgroep.zonderTags, t) })}>
                {t}
              </Chip>
            ))}
          </div>
        </Groep>
      )}

      <Groep titel="Aangemeld via">
        <div className="flex flex-wrap gap-1.5">
          {BRONNEN.map((b: Bron) => (
            <Chip key={b} aan={Boolean(doelgroep.bronnen?.includes(b))} onClick={() => zet({ bronnen: wissel(doelgroep.bronnen, b) })}>
              {BRON_LABEL[b]}
            </Chip>
          ))}
        </div>
      </Groep>

      {(formulieren.length > 0 || (doelgroep.formulieren?.length ?? 0) > 0) && (
        <Groep titel="Via aanmeldformulier" uitleg="Alleen contacten die zich via een van deze formulieren hebben aangemeld.">
          <div className="flex flex-wrap gap-1.5">
            {formulieren.map((f) => (
              <Chip key={f.id} aan={Boolean(doelgroep.formulieren?.includes(f.id))} onClick={() => zet({ formulieren: wissel(doelgroep.formulieren, f.id) })}>
                {f.naam}
                {f.actief ? "" : " (uit)"}
              </Chip>
            ))}
            {(doelgroep.formulieren ?? [])
              .filter((id) => !formulieren.some((f) => f.id === id))
              .map((id) => (
                <Chip key={id} aan onClick={() => zet({ formulieren: wissel(doelgroep.formulieren, id) })}>
                  {formulieren.length ? "Verwijderd formulier" : "Formulier…"}
                </Chip>
              ))}
          </div>
        </Groep>
      )}

      <Groep titel="Klant" uitleg="Op basis van betaalde bestellingen met hetzelfde e-mailadres.">
        <div className="flex flex-wrap gap-4 text-sm">
          {(
            [
              [undefined, "Maakt niet uit"],
              ["ja", "Heeft besteld"],
              ["nee", "Heeft nog niet besteld"],
            ] as const
          ).map(([w, label]) => (
            <label key={label} className="flex items-center gap-2">
              <input
                type="radio"
                name="besteld"
                checked={doelgroep.besteld === w}
                onChange={() => zet({ besteld: w })}
                className="accent-[var(--accent)]"
              />
              {label}
            </label>
          ))}
        </div>
      </Groep>

      {typen.length > 0 && (
        <Groep titel="Figuurtype" uitleg="Alleen klanten bij wie dit figuurtype uit de test kwam.">
          <div className="flex flex-wrap gap-1.5">
            {typen.map((t) => (
              <Chip key={t.letter} aan={Boolean(doelgroep.figuurtypes?.includes(t.letter))} onClick={() => zet({ figuurtypes: wissel(doelgroep.figuurtypes, t.letter) })}>
                {t.letter} · {t.naam}
              </Chip>
            ))}
          </div>
        </Groep>
      )}

      {!leeg && (
        <button type="button" onClick={() => onChange({})} className="w-fit text-xs text-foreground/70 underline underline-offset-4 hover:text-black/80">
          Alle filters wissen (iedereen)
        </button>
      )}
    </div>
  );
}
