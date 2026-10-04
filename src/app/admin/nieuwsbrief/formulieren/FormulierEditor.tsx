"use client";

import { useActionState, useState, type ReactNode } from "react";
import { AanmeldFormulier } from "@/components/AanmeldFormulier";
import {
  GERESERVEERDE_FORMULIER_SLUGS,
  MAX,
  NAAM_VELD_LABEL,
  NAAM_VELD_MODI,
  blokCode,
  geldigeFormulierSlug,
  maakSlug,
  type FormulierInvoer,
  type StandaardAanmeldTeksten,
} from "@/lib/nieuwsbrief/formulierregels";
import { TagInvoer } from "../contacten/Invoer";
import { invoerKlasse, kaart, knopHoofd, zacht } from "../_editor/stijl";
import { bewaarFormulier, type BewaarStaat } from "./acties";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";

function Veld({
  label,
  uitleg,
  htmlFor,
  children,
}: {
  label: string;
  uitleg?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {uitleg && <p className={`text-xs ${zacht}`}>{uitleg}</p>}
    </div>
  );
}

function Vinkje({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-[var(--accent)]"
      />
      <span>{children}</span>
    </label>
  );
}

/** Aanmaken en bewerken van een aanmeldformulier, met een live voorbeeld. */
export function FormulierEditor({
  id,
  begin,
  andereSlugs,
  tagSuggesties,
  standaard,
}: {
  id: string | null;
  begin: FormulierInvoer;
  /** Slugs van de andere formulieren (voor een directe waarschuwing). */
  andereSlugs: string[];
  tagSuggesties: string[];
  standaard: StandaardAanmeldTeksten;
}) {
  const [staat, verstuur, bezig] = useActionState<BewaarStaat, FormData>(bewaarFormulier, null);
  const [w, setW] = useState(begin);
  const [slugAangepast, setSlugAangepast] = useState(Boolean(id));
  const zet = <K extends keyof FormulierInvoer>(k: K, v: FormulierInvoer[K]) => setW((oud) => ({ ...oud, [k]: v }));

  const slugProbleem = !w.slug
    ? null
    : GERESERVEERDE_FORMULIER_SLUGS.has(w.slug)
      ? "Deze slug is al in gebruik door de website."
      : !geldigeFormulierSlug(w.slug)
        ? "Alleen kleine letters, cijfers en losse streepjes (bijv. ‘zomer-actie’)."
        : andereSlugs.includes(w.slug)
          ? "Een ander formulier gebruikt deze slug al."
          : null;
  const slugGewijzigd = Boolean(id) && begin.slug !== w.slug;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form action={verstuur} className="flex min-w-0 flex-col gap-5">
        {id && <input type="hidden" name="id" value={id} />}

        {staat?.fouten.length ? (
          <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <ul className="list-inside list-disc">
              {staat.fouten.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Algemeen</h2>
          <Veld label="Naam (alleen voor jezelf)" htmlFor="naam">
            <input
              id="naam"
              name="naam"
              required
              maxLength={MAX.naam}
              value={w.naam}
              onChange={(e) => {
                const naam = e.target.value;
                setW((oud) => ({ ...oud, naam, ...(slugAangepast ? {} : { slug: maakSlug(naam) }) }));
              }}
              placeholder="Bijv. Zomeractie 2026"
              className={invoerKlasse}
            />
          </Veld>
          <Veld
            label="Slug"
            htmlFor="slug"
            uitleg={
              <>
                Het webadres wordt <span className="font-mono">/nieuwsbrief/{w.slug || "…"}</span> en de blokcode{" "}
                <span className="font-mono">{w.slug ? blokCode(w.slug) : "{nieuwsbrief_…}"}</span>.
              </>
            }
          >
            <input
              id="slug"
              name="slug"
              required
              maxLength={MAX.slug}
              value={w.slug}
              onChange={(e) => {
                setSlugAangepast(true);
                zet("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }}
              aria-invalid={Boolean(slugProbleem)}
              className={`${invoerKlasse} font-mono`}
            />
            {slugProbleem && <p className="text-xs text-red-700 dark:text-red-300">{slugProbleem}</p>}
            {slugGewijzigd && !slugProbleem && (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Let op: na het wijzigen van de slug werken de oude link (/nieuwsbrief/{begin.slug}) en de oude blokcode{" "}
                {blokCode(begin.slug)} niet meer. Pas pagina&apos;s waarop het formulier staat ook aan.
              </p>
            )}
          </Veld>
          <div className="flex flex-col gap-2">
            <Vinkje name="actief" checked={w.actief} onChange={(v) => zet("actief", v)}>
              Actief <span className={zacht}>— uit = het formulier verschijnt nergens en aanmelden ermee kan niet.</span>
            </Vinkje>
            <Vinkje name="eigen_pagina" checked={w.eigen_pagina} onChange={(v) => zet("eigen_pagina", v)}>
              Eigen pagina op /nieuwsbrief/{w.slug || "…"}{" "}
              <span className={zacht}>— handig om te delen via social media of een QR-code.</span>
            </Vinkje>
          </div>
        </section>

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Teksten</h2>
          <Veld label="Titel" htmlFor="titel" uitleg="Mag leeg blijven.">
            <input
              id="titel"
              name="titel"
              maxLength={MAX.titel}
              value={w.titel}
              onChange={(e) => zet("titel", e.target.value)}
              className={invoerKlasse}
            />
          </Veld>
          <Veld label="Tekst" htmlFor="tekst" uitleg={OPMAAK_UITLEG}>
            <textarea
              id="tekst"
              name="tekst"
              rows={4}
              maxLength={MAX.tekst}
              value={w.tekst}
              onChange={(e) => zet("tekst", e.target.value)}
              className={invoerKlasse}
            />
          </Veld>
          <Veld label="Naamveld">
            <div className="flex flex-wrap gap-4 text-sm">
              {NAAM_VELD_MODI.map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="naam_veld"
                    value={m}
                    checked={w.naam_veld === m}
                    onChange={() => zet("naam_veld", m)}
                    className="accent-[var(--accent)]"
                  />
                  {NAAM_VELD_LABEL[m]}
                </label>
              ))}
            </div>
          </Veld>
          <Veld label="Knoptekst" htmlFor="knop">
            <input
              id="knop"
              name="knop"
              required
              maxLength={MAX.knop}
              value={w.knop}
              onChange={(e) => zet("knop", e.target.value)}
              className={invoerKlasse}
            />
          </Veld>
          <Veld label="Melding na aanmelden" htmlFor="succes_tekst">
            <textarea
              id="succes_tekst"
              name="succes_tekst"
              rows={2}
              required
              maxLength={MAX.succes_tekst}
              value={w.succes_tekst}
              onChange={(e) => zet("succes_tekst", e.target.value)}
              className={invoerKlasse}
            />
            {w.dubbele_opt_in && !/mail|bevestig/i.test(w.succes_tekst) && (
              <p className="text-xs text-amber-800 dark:text-amber-300">
                Tip: vertel hier dat er een mail onderweg is waarin de aanmelding bevestigd moet worden.
              </p>
            )}
          </Veld>
          <Veld
            label="Toestemmingstekst"
            htmlFor="toestemming_tekst"
            uitleg={
              <>
                Staat onder het formulier en wordt bij elke aanmelding (als platte tekst) bewaard als bewijs van toestemming.
                Leeg = de standaardtekst uit Teksten → Nieuwsbrief. {OPMAAK_UITLEG}
              </>
            }
          >
            <textarea
              id="toestemming_tekst"
              name="toestemming_tekst"
              rows={3}
              maxLength={MAX.toestemming_tekst}
              value={w.toestemming_tekst}
              placeholder={standaard.toestemming_tekst}
              onChange={(e) => zet("toestemming_tekst", e.target.value)}
              className={invoerKlasse}
            />
          </Veld>
        </section>

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Aanmelders</h2>
          <Veld
            label="Tags voor nieuwe aanmelders"
            uitleg="Iedereen die zich via dit formulier aanmeldt krijgt deze tags, zodat je deze groep later apart kunt mailen."
          >
            <TagInvoer name="tags" begin={begin.tags} suggesties={tagSuggesties} />
          </Veld>
          <div className="flex flex-col gap-2">
            <Vinkje name="dubbele_opt_in" checked={w.dubbele_opt_in} onChange={(v) => zet("dubbele_opt_in", v)}>
              Dubbele opt-in (aanbevolen)
            </Vinkje>
            <p className={`text-xs ${zacht}`}>
              Met dubbele opt-in krijgt een nieuwe aanmelder eerst een mail met een bevestigingslink. Pas na die klik is
              iemand echt aangemeld. Zo weet je zeker dat het e-mailadres klopt en dat de eigenaar zelf toestemming gaf;
              dat is je bewijs voor de AVG en het houdt je lijst schoon (minder spamklachten en onbestelbare adressen).
            </p>
            {!w.dubbele_opt_in && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <strong>Let op:</strong> zonder dubbele opt-in is iedereen die dit formulier invult meteen aangemeld, ook als
                iemand andermans e-mailadres invult. Zet dit alleen uit als je de toestemming op een andere manier kunt
                aantonen (bijvoorbeeld een formulier dat je zelf invult tijdens een workshop, met de deelnemer erbij).
                Afgemelde adressen worden dan ook direct weer aangemeld.
              </p>
            )}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button className={knopHoofd} disabled={bezig || Boolean(slugProbleem)}>
            {bezig ? "Bezig…" : id ? "Opslaan" : "Formulier aanmaken"}
          </button>
        </div>
      </form>

      <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
        <p className={`text-sm font-medium ${zacht}`}>Voorbeeld</p>
        <div className="rounded-2xl border border-black/10 bg-background px-4 py-8 dark:border-white/15">
          <AanmeldFormulier formulier={w} standaard={standaard} voorbeeld />
        </div>
        <p className={`text-xs ${zacht}`}>
          Zo ziet het formulier eruit op de website. In dit voorbeeld wordt niets verstuurd.
          {!w.actief && " Het formulier staat uit en is nu nergens te zien."}
        </p>
      </aside>
    </div>
  );
}
