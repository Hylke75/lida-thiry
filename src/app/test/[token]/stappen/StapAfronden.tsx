import type { MaatVeld } from "@/lib/test-config";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { PasvormVraag } from "@/lib/inhoud/groepen/test";
import { logischeChecks } from "@/rekenkern/plausibiliteit";
import { Opmaak } from "@/components/Opmaak";
import { overzichtRijen, type Antwoorden, type Stap } from "../wizard-regels";

/** Laatste stap: overzicht van alle antwoorden, met per regel een link om te wijzigen. */
export function StapAfronden({
  a,
  gaNaar,
  silhouetten,
  stappen,
  maatVelden,
  vragen,
  intro,
}: {
  a: Antwoorden;
  gaNaar: (i: number) => void;
  silhouetten: Silhouet[];
  stappen: Stap[];
  maatVelden: MaatVeld[];
  vragen: PasvormVraag[];
  /** Uitleg boven het overzicht (met opmaak). */
  intro: string;
}) {
  const n = (v: string | undefined) => Number(v);
  const meldingen = logischeChecks({
    borst: n(a.maten.borst),
    taille: n(a.maten.taille),
    hogeHeup: n(a.maten.hoge_heup),
    heup: n(a.maten.heup),
  });
  const rijen = overzichtRijen(a, stappen, maatVelden, vragen, silhouetten);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 text-sm text-black/60 dark:text-white/60 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5">
        <Opmaak tekst={intro} />
      </div>
      {meldingen.map((m) => (
        <p
          key={m.code}
          className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {m.bericht}
        </p>
      ))}
      <dl className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {rijen.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-black/60 dark:text-white/60">{r.label}</dt>
            <dd className="flex items-center gap-3 text-right font-medium">
              {r.waarde}
              <button
                type="button"
                onClick={() => gaNaar(r.stap)}
                className="text-xs font-normal text-accent underline underline-offset-2"
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
