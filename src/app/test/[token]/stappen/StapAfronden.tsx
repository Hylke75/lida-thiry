import type { MaatVeld } from "@/lib/test-config";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { PasvormVraag } from "@/lib/inhoud/groepen/test";
import { logischeChecks } from "@/rekenkern/plausibiliteit";
import { Opmaak } from "@/components/Opmaak";
import { overzichtRijen, type Antwoorden, type Stap } from "../wizard-regels";
import { KLANT_INTRO, klantMeldingKlassen } from "@/components/site/KlantPagina";

/** Laatste stap: overzicht van alle antwoorden, met per regel een link om te wijzigen. */
export function StapAfronden({
  a,
  gaNaar,
  silhouetten,
  stappen,
  maatVelden,
  vragen,
  intro,
  bandmaatLabel,
}: {
  a: Antwoorden;
  gaNaar: (i: number) => void;
  silhouetten: Silhouet[];
  stappen: Stap[];
  maatVelden: MaatVeld[];
  vragen: PasvormVraag[];
  /** Uitleg boven het overzicht (met opmaak). */
  intro: string;
  /** Label van de bandmaat; alleen als dat veld in de test staat. */
  bandmaatLabel?: string;
}) {
  const n = (v: string | undefined) => Number(v);
  const meldingen = logischeChecks({
    borst: n(a.maten.borst),
    taille: n(a.maten.taille),
    hogeHeup: n(a.maten.hoge_heup),
    heup: n(a.maten.heup),
  });
  const rijen = overzichtRijen(a, stappen, maatVelden, vragen, silhouetten, bandmaatLabel);

  return (
    <div className="flex flex-col gap-5">
      <div className={`${KLANT_INTRO} flex flex-col gap-2 text-[17px] [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_p]:m-0 [&_ul]:list-disc [&_ul]:pl-5`}>
        <Opmaak tekst={intro} />
      </div>
      {meldingen.map((m) => (
        <p
          key={m.code}
          className={`${klantMeldingKlassen("letop")} m-0`}
        >
          {m.bericht}
        </p>
      ))}
      <dl className="m-0 divide-y divide-line rounded-ontwerp-md border border-line bg-white">
        {rijen.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 py-1 pr-2 pl-5 text-[15px] tablet:pl-6">
            <dt className="text-ink-soft">{r.label}</dt>
            <dd className="m-0 flex items-center gap-2 text-right font-bold text-ink">
              {r.waarde}
              <button
                type="button"
                onClick={() => gaNaar(r.stap)}
                className="inline-flex min-h-11 items-center px-2 text-[15px] font-bold text-berry underline underline-offset-[3px] hover:text-ink"
              >
                wijzig
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
