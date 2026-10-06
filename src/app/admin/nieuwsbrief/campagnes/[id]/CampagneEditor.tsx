"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailEditor, type EditorStaat } from "../../_editor/MailEditor";
import type { MailInhoud, TypeKeuze } from "../../_editor/regels";
import { toonDatumTijd, utcNaarAmsterdamInvoer } from "@/lib/datum";
import { annuleerPlanning, hervat, kiesWinnaarNu, pauzeer, planIn, verzendNu } from "../acties";
import { invoerBreed, kaart, knop, knopSecundair, tekstZacht, toon } from "@/components/admin/stijl";

/** A/B-test van de opgeslagen campagne. */
export interface AbStand {
  /** Uren wachten; null = geen A/B-test. */
  wachtUren: number | null;
  percentage: number | null;
  winnaar: "a" | "b" | null;
}

type Status = "concept" | "ingepland" | "bezig" | "verzonden" | "gepauzeerd";

function Verzenden({
  id,
  status,
  ingeplandOp,
  maxPerDag,
  standaardMoment,
  staat,
  ab,
}: {
  id: string;
  status: Status;
  ingeplandOp: string | null;
  maxPerDag: number;
  standaardMoment: string;
  staat: EditorStaat;
  ab: AbStand;
}) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [moment, setMoment] = useState(() => (ingeplandOp ? utcNaarAmsterdamInvoer(ingeplandOp) : standaardMoment));

  const voerUit = (actie: () => Promise<{ ok: true; bericht: string } | { ok: false; fouten: string[] }>) =>
    start(async () => {
      setMelding(null);
      const r = await actie();
      setMelding(r.ok ? { soort: "ok", tekst: [r.bericht] } : { soort: "fout", tekst: r.fouten });
      router.refresh();
    });

  const kanVerzenden = !staat.gewijzigd && staat.problemen.length === 0 && !staat.bezig && !bezig;
  const aantalTekst =
    staat.aantal === null ? "de ontvangers" : `${staat.aantal.toLocaleString("nl-NL")} ${staat.aantal === 1 ? "ontvanger" : "ontvangers"}`;
  const meerDagen = staat.aantal !== null && staat.aantal > maxPerDag;

  const nuVerzenden = () => {
    if (staat.aantal === 0) {
      setMelding({ soort: "fout", tekst: ["Er zijn geen ontvangers in deze doelgroep. Pas de ontvangers aan."] });
      return;
    }
    const tekst =
      `De nieuwsbrief nu versturen naar ${aantalTekst}?` +
      (ab.wachtUren !== null
        ? `\n\nA/B-test: eerst krijgt ${ab.percentage}% onderwerp A of B; na ${ab.wachtUren} uur krijgt de rest het winnende onderwerp.`
        : "") +
      (meerDagen ? `\n\nJe kunt maximaal ${maxPerDag} mails per dag versturen; de rest gaat automatisch in de volgende dagen.` : "") +
      "\n\nDit kun je niet ongedaan maken.";
    if (!confirm(tekst)) return;
    voerUit(() => verzendNu(id));
  };

  return (
    <section className={`${kaart} border-accent/30`}>
      <h2 className="text-lg font-semibold">Verzenden</h2>

      {(status === "concept" || status === "ingepland") && (
        <>
          {status === "ingepland" && (
            <p className="rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              Ingepland voor <strong>{toonDatumTijd(ingeplandOp)}</strong>. Wijzigingen die je opslaat, worden meegenomen.
            </p>
          )}
          {staat.problemen.length > 0 && (
            <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <p className="font-medium">Nog niet klaar om te verzenden:</p>
              <ul className="mt-1 list-disc pl-5">
                {staat.problemen.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          )}
          {staat.gewijzigd && <p className="text-sm text-amber-800 dark:text-amber-300">Sla je wijzigingen eerst op.</p>}
          <p className={`text-sm ${tekstZacht}`}>
            Gaat naar <strong className="text-foreground">{aantalTekst}</strong>. Er gaan maximaal {maxPerDag} mails per dag
            de deur uit (instelling bij Instellingen → Algemeen).
            {meerDagen
              ? ` Omdat het er meer zijn, gaat de rest automatisch in de volgende dagen.`
              : " Grotere aantallen worden automatisch over meerdere dagen verdeeld."}
          </p>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={nuVerzenden} disabled={!kanVerzenden} className={knop}>
              {bezig ? "Bezig…" : "Nu verzenden"}
            </button>
          </div>

          <div className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
            <label htmlFor="moment" className="text-sm font-medium">
              Of plan in (Nederlandse tijd)
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="moment"
                type="datetime-local"
                value={moment}
                onChange={(e) => setMoment(e.target.value)}
                className={`${invoerBreed} sm:max-w-60`}
              />
              <button type="button" disabled={!kanVerzenden || !moment} onClick={() => voerUit(() => planIn(id, moment))} className={`${knopSecundair} shrink-0`}>
                {status === "ingepland" ? "Nieuw moment opslaan" : "Inplannen"}
              </button>
              {status === "ingepland" && (
                <button type="button" disabled={bezig} onClick={() => voerUit(() => annuleerPlanning(id))} className={`${knopSecundair} shrink-0`}>
                  Inplannen annuleren
                </button>
              )}
            </div>
            <p className={`text-xs ${tekstZacht}`}>Het versturen start bij de eerstvolgende verzendronde na dit moment.</p>
          </div>
        </>
      )}

      {(status === "bezig" || status === "gepauzeerd") && ab.wachtUren !== null && !ab.winnaar && (
        <div className="flex flex-col gap-2 rounded-lg bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          <p>
            <strong>A/B-test loopt.</strong> De testgroep krijgt onderwerp A of B. Zodra die verstuurd is en {ab.wachtUren} uur
            voorbij is, wordt bij de volgende verzendronde het onderwerp met de meeste opens gekozen en gaat de campagne naar
            de rest.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={bezig}
              onClick={() => {
                if (confirm("Nu de winnaar kiezen op basis van de cijfers tot nu toe, en de rest van de doelgroep versturen?")) {
                  voerUit(() => kiesWinnaarNu(id));
                }
              }}
              className={knop}
            >
              Kies winnaar nu
            </button>
          </div>
        </div>
      )}
      {(status === "bezig" || status === "gepauzeerd" || status === "verzonden") && ab.winnaar && ab.wachtUren !== null && (
        <p className="text-sm">
          A/B-test: onderwerp <strong>{ab.winnaar.toUpperCase()}</strong> heeft gewonnen.
        </p>
      )}

      {(status === "bezig" || status === "gepauzeerd") && (
        <>
          <p className="text-sm">
            {status === "bezig"
              ? "De campagne wordt verstuurd. Er gaan maximaal " +
                maxPerDag +
                " mails per dag uit; het versturen gaat vanzelf verder in de volgende rondes."
              : "Het versturen is gepauzeerd. Mails die nog in de wachtrij staan, worden pas verstuurd als je verdergaat."}
          </p>
          <div className="flex flex-wrap gap-2">
            {status === "bezig" ? (
              <button type="button" disabled={bezig} onClick={() => voerUit(() => pauzeer(id))} className={knopSecundair}>
                Pauzeren
              </button>
            ) : (
              <button type="button" disabled={bezig} onClick={() => voerUit(() => hervat(id))} className={knop}>
                Verder met versturen
              </button>
            )}
            <Link href={`/admin/nieuwsbrief/campagnes/${id}/rapport`} className={knopSecundair}>
              Rapport bekijken
            </Link>
          </div>
        </>
      )}

      {status === "verzonden" && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm">Deze campagne is verzonden.</p>
          <Link href={`/admin/nieuwsbrief/campagnes/${id}/rapport`} className={knop}>
            Rapport bekijken
          </Link>
        </div>
      )}

      {melding && (
        <div
          role={melding.soort === "fout" ? "alert" : "status"}
          className={`rounded-lg px-4 py-3 text-sm ${
            melding.soort === "ok"
              ? toon.groen
              : toon.rood
          }`}
        >
          {melding.tekst.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      )}
    </section>
  );
}

/** Editor van een campagne met het verzendpaneel erbij. */
export function CampagneEditor(props: {
  id: string;
  status: Status;
  ingeplandOp: string | null;
  maxPerDag: number;
  standaardMoment: string;
  beginInhoud: MailInhoud;
  afzender: { naam: string; adres: string | null };
  tags: string[];
  typen: TypeKeuze[];
  testAdres: string;
  ab: AbStand;
}) {
  const alleenLezen = !(props.status === "concept" || props.status === "ingepland");
  return (
    <MailEditor
      id={props.id}
      soort="campagne"
      beginInhoud={props.beginInhoud}
      alleenLezen={alleenLezen}
      afzender={props.afzender}
      tags={props.tags}
      typen={props.typen}
      testAdres={props.testAdres}
      zijpaneel={(staat) => (
        <Verzenden
          id={props.id}
          status={props.status}
          ingeplandOp={props.ingeplandOp}
          maxPerDag={props.maxPerDag}
          standaardMoment={props.standaardMoment}
          staat={staat}
          ab={props.ab}
        />
      )}
    />
  );
}
