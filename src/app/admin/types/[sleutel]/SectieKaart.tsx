import type { LetterKeuze } from "@/lib/adviestypes-beheer";
import { ActieFormulier, GroeiendTekstvak } from "../ActieFormulier";
import { BeeldKiezer } from "../BeeldKiezer";
import { KopieerSectie, type TypeKeuze } from "../KopieerSectie";
import { slaSectieOp, verwijderSectie, vulVeld } from "../acties";
import { invoerBreed, kaartVlak, knop, knopKlein } from "@/components/admin/stijl";
import { BeeldTegel } from "./BeeldTegel";
import { Verborgen } from "./onderdelen";
import type { Sectie, Veld } from "./regels";

/** Een vast veld dat nog leeg is: komt niet in de PDF, met een knop om het te vullen. */
export function LeegVeld({ veld, sleutel }: { veld: Veld; sleutel: string }) {
  return (
    <section
      id={`veld-${veld.sleutel}`}
      className="flex scroll-mt-6 flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-black/20 p-4 dark:border-white/25"
    >
      <div>
        <h3 className="font-serif text-lg text-foreground/70">
          {veld.kop}
        </h3>
        <p className="text-xs text-foreground/70">
          Nog leeg; komt niet in de PDF. {veld.hulptekst}
        </p>
      </div>
      <ActieFormulier actie={vulVeld}>
        <Verborgen waarden={{ sleutel, veld: veld.sleutel }} />
        <button className={knopKlein}>+ Tekst toevoegen</button>
      </ActieFormulier>
    </section>
  );
}

/** Een ingevulde sectie: tekst bewerken, leegmaken, beelden beheren en naar andere types kopiëren. */
export function SectieKaart({
  sectie: s,
  hulp,
  sleutel,
  categorie,
  andereTypes,
  letters,
}: {
  sectie: Sectie;
  hulp: string | null;
  sleutel: string;
  categorie: number;
  andereTypes: TypeKeuze[];
  letters: LetterKeuze[];
}) {
  return (
    <section
      id={`sectie-${s.id}`}
      className={`${kaartVlak} flex scroll-mt-6 flex-col gap-4`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-serif text-xl">{s.kop}</h3>
          {hulp && (
            <p className="mt-0.5 text-xs text-foreground/70">
              {hulp}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <ActieFormulier
            actie={verwijderSectie}
            stil
            bevestig={`'${s.kop}' leegmaken in ${sleutel}?\n\nDe tekst en de beeldkoppelingen van dit veld gaan verloren. De beelden blijven in de beeldbank staan.`}
          >
            <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
            <button
              className={`${knopKlein} hover:!border-red-600 hover:!text-red-700`}
            >
              Veld leegmaken
            </button>
          </ActieFormulier>
        </div>
      </div>

      <ActieFormulier
        actie={slaSectieOp}
        bewaakWijzigingen
        className="flex flex-col gap-3"
      >
        <Verborgen waarden={{ sleutel, sectie_id: s.id }} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Tekst
          <GroeiendTekstvak
            name="tekst"
            defaultValue={s.tekst}
            rows={6}
            className={`${invoerBreed} resize-y font-normal leading-relaxed`}
          />
        </label>
        <p className="text-xs text-foreground/70">
          Lege regel = nieuwe alinea · regel beginnen met &ldquo;-
          &rdquo; = opsommingsteken · **vet** · *cursief*
        </p>
        <div>
          <button className={knop}>Opslaan</button>
        </div>
      </ActieFormulier>

      <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
        <h3 className="text-sm font-medium">
          Beelden bij dit veld ({s.beelden.length})
        </h3>
        <p className="text-xs leading-relaxed text-foreground/70">
          Beelden staan in de centrale beeldbank. Bewerk of
          vervang je een beeld daar, dan verandert het in{" "}
          <strong>elke hand-out</strong> die dat beeld gebruikt.
          &lsquo;Uit sectie halen&rsquo; haalt het alleen hier
          weg.
        </p>
        <div className="flex flex-wrap items-stretch gap-3">
          {s.beelden.map((b, j) => (
            <BeeldTegel
              key={`${b.volgorde}-${b.beeld_id}`}
              beeld={b}
              sleutel={sleutel}
              sectieId={s.id}
              sectieKop={s.kop}
              eerste={j === 0}
              laatste={j === s.beelden.length - 1}
            />
          ))}
          <BeeldKiezer
            sleutel={sleutel}
            sectieId={s.id}
            kop={s.kop}
            aanwezig={s.beelden.map((b) => b.beeld_id)}
          />
        </div>
      </div>

      <KopieerSectie
        sleutel={sleutel}
        sectieId={s.id}
        kop={s.kop}
        categorie={categorie}
        types={andereTypes}
        letters={letters}
      />
    </section>
  );
}
