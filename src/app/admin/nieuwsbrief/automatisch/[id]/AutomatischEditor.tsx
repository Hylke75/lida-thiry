"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailEditor, type EditorStaat } from "../../_editor/MailEditor";
import type { MailInhoud } from "../../_editor/regels";
import { zetActief } from "../acties";
import { kaart, knopSecundair, tekstZacht, toon } from "@/components/admin/stijl";

function AanUit({ id, staat }: { id: string; staat: EditorStaat }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const kanAanzetten = !staat.gewijzigd && staat.problemen.length === 0;

  const wissel = () =>
    start(async () => {
      setMelding(null);
      const nieuw = !staat.actief;
      const r = await zetActief(id, nieuw);
      if (r.ok) staat.zetActief(nieuw);
      setMelding(r.ok ? { soort: "ok", tekst: [r.bericht] } : { soort: "fout", tekst: r.fouten });
      router.refresh();
    });

  return (
    <section className={`${kaart} border-accent/30`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">Status</h2>
          <p className={`text-sm ${tekstZacht}`}>
            {staat.actief ? "Deze mail staat aan en wordt automatisch verstuurd." : "Deze mail staat uit; er wordt niets verstuurd."}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={staat.actief}
          onClick={wissel}
          disabled={bezig || (!staat.actief && !kanAanzetten)}
          className="flex items-center gap-3 rounded-full disabled:opacity-40"
        >
          <span className={`relative h-7 w-12 rounded-full transition-colors ${staat.actief ? "bg-accent" : "bg-black/20 dark:bg-white/20"}`}>
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${staat.actief ? "left-6" : "left-1"}`}
            />
          </span>
          <span className="text-sm font-medium">{bezig ? "Bezig…" : staat.actief ? "Aan" : "Uit"}</span>
        </button>
      </div>
      {!staat.actief && staat.problemen.length > 0 && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          <p className="font-medium">Nog niet klaar om aan te zetten:</p>
          <ul className="mt-1 list-disc pl-5">
            {staat.problemen.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {staat.gewijzigd && !staat.actief && <p className="text-sm text-amber-800 dark:text-amber-300">Sla je wijzigingen eerst op.</p>}
      {staat.actief && (
        <p className="text-xs text-foreground/70">
          Deze mail staat aan. Iedereen die zich aanmeldt (of een advies krijgt) sinds je hem aanzette, ontvangt hem.
          Wijzigingen gelden voor mails die nog verstuurd moeten worden. Zet je hem uit en weer aan, dan tellen alleen
          nieuwe aanmeldingen (of adviezen) vanaf dat moment.
        </p>
      )}
      <p className={`text-xs ${tekstZacht}`}>
        Automatische mails tellen mee voor de daglimiet en worden in dezelfde verzendrondes verstuurd als campagnes.
      </p>
      <Link href={`/admin/nieuwsbrief/campagnes/${id}/rapport`} className={`${knopSecundair} w-fit`}>
        Rapport bekijken
      </Link>
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

/** Editor van een automatische mail met de aan/uit-schakelaar erbij. */
export function AutomatischEditor(props: {
  id: string;
  actief: boolean;
  beginInhoud: MailInhoud;
  afzender: { naam: string; adres: string | null };
  testAdres: string;
}) {
  return (
    <MailEditor
      id={props.id}
      soort="automatisch"
      beginInhoud={props.beginInhoud}
      beginActief={props.actief}
      alleenLezen={false}
      afzender={props.afzender}
      tags={[]}
      typen={[]}
      testAdres={props.testAdres}
      zijpaneel={(staat) => <AanUit id={props.id} staat={staat} />}
    />
  );
}
