"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Melding } from "../Melding";
import { veroorzaakTestfout } from "./acties";

/** Knop "Testfout veroorzaken": controleert foutlog, mail en serverkoppeling. */
export function TestfoutKnop({ className }: { className?: string }) {
  const router = useRouter();
  const [bezig, start] = useTransition();
  const [klaar, setKlaar] = useState(false);

  const klik = () => {
    setKlaar(false);
    start(async () => {
      try {
        await veroorzaakTestfout();
      } catch {
        // Verwacht: de actie gooit expres een fout.
      }
      setKlaar(true);
      // De serverfout wordt na het antwoord geregistreerd; even wachten.
      setTimeout(() => router.refresh(), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={klik} disabled={bezig} className={className}>
        {bezig ? "Bezig…" : "Testfout veroorzaken"}
      </button>
      {klaar && (
        <Melding soort="ok">
          Twee testfouten gemaakt: één met bron Test (daarover krijg je een mail, als het e-mailadres voor
          foutmeldingen is ingesteld) en één met bron Server. Ze verschijnen zo in de lijst; verwijder ze daarna gerust.
        </Melding>
      )}
    </div>
  );
}
