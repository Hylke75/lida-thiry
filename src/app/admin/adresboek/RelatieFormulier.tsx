"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { Relatie } from "@/lib/relaties/regels";
import { normaliseerPostcode } from "@/lib/relaties/regels";
import { TagInvoer } from "../nieuwsbrief/contacten/Invoer";
import { Melding } from "../AdminNav";
import { bewaarRelatie, type FormulierStatus } from "./acties";
import { hoofdknop, invoer, PAD } from "./ui";

const TEKSTVELDEN = ["voornaam", "achternaam", "email", "telefoon", "bedrijf", "straat", "postcode", "plaats", "land", "geboortedatum", "notities"] as const;
type Tekstveld = (typeof TEKSTVELDEN)[number];

const foutRand = "border-red-400 dark:border-red-700";

export function RelatieFormulier({ relatie, tags }: { relatie: Relatie | null; tags: string[] }) {
  const [status, actie, bezig] = useActionState<FormulierStatus, FormData>(bewaarRelatie, {});
  // Gecontroleerde velden: zo blijft de invoer staan als de server een fout teruggeeft.
  const [w, setW] = useState<Record<Tekstveld, string>>(() =>
    Object.fromEntries(TEKSTVELDEN.map((k) => [k, (relatie?.[k] as string | null | undefined) ?? (k === "land" ? "Nederland" : "")])) as Record<Tekstveld, string>,
  );
  const zet = (k: Tekstveld) => (e: { target: { value: string } }) => setW((oud) => ({ ...oud, [k]: e.target.value }));
  const f = status.veldFouten ?? {};

  const tekst = (k: Tekstveld, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}, fout?: string) => (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      <input
        name={k}
        value={w[k]}
        onChange={zet(k)}
        aria-invalid={fout ? true : undefined}
        className={`${invoer} ${fout ? foutRand : ""}`}
        {...extra}
      />
      {fout && <span className="text-xs text-red-700 dark:text-red-300">{fout}</span>}
    </label>
  );

  return (
    <form action={actie} className="flex flex-col gap-4">
      {relatie && <input type="hidden" name="id" value={relatie.id} />}
      {status.fout && (
        <Melding soort="fout">
          {status.fout}
          {status.bestaand && (
            <>
              {" "}
              <Link href={`${PAD}/${status.bestaand.id}`} className="font-medium underline underline-offset-4">
                Bekijk {status.bestaand.naam}
              </Link>
              {relatie && (
                <>
                  {" "}of{" "}
                  <Link href={`${PAD}/dubbel?a=${relatie.id}&b=${status.bestaand.id}`} className="font-medium underline underline-offset-4">
                    voeg ze samen
                  </Link>
                </>
              )}
              .
            </>
          )}
        </Melding>
      )}
      {f.naam && <p className="text-sm text-red-700 dark:text-red-300">{f.naam}</p>}

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Naam</legend>
        {tekst("voornaam", "Voornaam", { maxLength: 100, autoComplete: "off" })}
        {tekst("achternaam", "Achternaam", { maxLength: 100, autoComplete: "off" })}
        {tekst("email", "E-mailadres", { type: "email", maxLength: 254, autoComplete: "off" }, f.email)}
        {tekst("telefoon", "Telefoon", { type: "tel", maxLength: 100, autoComplete: "off" })}
        {tekst("bedrijf", "Bedrijf", { maxLength: 100 })}
        {tekst("geboortedatum", "Geboortedatum", { type: "date", min: "1900-01-01" }, f.geboortedatum)}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <legend className="mb-2 text-sm font-medium">Adres</legend>
        <div className="sm:col-span-2">{tekst("straat", "Straat en huisnummer", { maxLength: 200 })}</div>
        {tekst("postcode", "Postcode", {
          maxLength: 20,
          onBlur: () => setW((oud) => ({ ...oud, postcode: normaliseerPostcode(oud.postcode) ?? "" })),
        })}
        {tekst("plaats", "Plaats", { maxLength: 100 })}
        {tekst("land", "Land", { maxLength: 60 })}
      </fieldset>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Tags</span>
        <TagInvoer name="tags" begin={relatie?.tags ?? []} suggesties={tags} />
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Notities</span>
        <textarea name="notities" value={w.notities} onChange={zet("notities")} rows={6} maxLength={50_000} className={`${invoer} font-normal`} />
        <span className="text-xs text-black/50 dark:text-white/50">
          Alleen zichtbaar voor beheerders. {relatie ? "Een nieuwe notitie met datum voeg je hieronder toe." : ""}
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button className={hoofdknop} disabled={bezig}>
          {bezig ? "Bezig…" : relatie ? "Opslaan" : "Toevoegen"}
        </button>
        {!relatie && (
          <Link href={PAD} className="text-sm underline underline-offset-4">
            Annuleren
          </Link>
        )}
      </div>
    </form>
  );
}
