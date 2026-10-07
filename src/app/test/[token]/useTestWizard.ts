// Toestand van de testwizard: antwoorden, huidige stap, voortgang in localStorage
// en het versturen naar /api/test/[token].

import { meet } from "@/lib/analytics/meet";
import { GEBEURTENISSEN } from "@/lib/analytics/regels";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import { maatVeldenMetTeksten, pasvormVragen, type TestTeksten } from "@/lib/inhoud/groepen/test";
import {
  EERSTE_MATEN_STAP,
  LEEG,
  isBereikbaar,
  maakPayload,
  maakStappen,
  silhouetVerschilMelding,
  stapFout,
  type Antwoorden,
  type Bevinding,
  type Resultaat,
} from "./wizard-regels";

export function useTestWizard({
  token,
  silhouetten,
  teksten,
  vraagBandmaat = false,
}: {
  token: string;
  silhouetten: Silhouet[];
  teksten: TestTeksten;
  /** Bandmaat van de bh vragen (alleen als de extra figuurtypes I en O aan staan). */
  vraagBandmaat?: boolean;
}) {
  const maatVelden = useMemo(() => maatVeldenMetTeksten(teksten.maten), [teksten.maten]);
  const vragen = useMemo(() => pasvormVragen(teksten.vragen), [teksten.vragen]);
  const STAPPEN = useMemo(() => maakStappen(teksten, maatVelden, vragen), [teksten, maatVelden, vragen]);
  const aantalStappen = STAPPEN.length;
  const opslagSleutel = `lida-test-${token}`;
  const [a, setA] = useState<Antwoorden>(LEEG);
  const [stap, setStap] = useState(0);
  const [bereikt, setBereikt] = useState(0);
  const [toonFouten, setToonFouten] = useState(false);
  const [hermeting, setHermeting] = useState(false);
  // Pas opslaan nadat de bewaarde voortgang is hersteld, anders overschrijven we die.
  const [hersteld, setHersteld] = useState(false);

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [bevindingen, setBevindingen] = useState<Bevinding[]>([]);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const kop = useRef<HTMLDivElement>(null);

  // Voortgang bewaren in de browser, zodat je later via dezelfde link verdergaat.
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(opslagSleutel);
      if (opgeslagen) {
        const o = JSON.parse(opgeslagen);
        /* eslint-disable react-hooks/set-state-in-effect -- eenmalig herstellen uit localStorage */
        setA({ ...LEEG, ...o.a });
        setStap(Math.min(o.stap ?? 0, aantalStappen - 1));
        setBereikt(Math.min(o.bereikt ?? 0, aantalStappen - 1));
        setHermeting(Boolean(o.hermeting));
      }
    } catch {}
    setHersteld(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [opslagSleutel, aantalStappen]);

  useEffect(() => {
    if (!hersteld || resultaat) return;
    try {
      localStorage.setItem(opslagSleutel, JSON.stringify({ a, stap, bereikt, hermeting }));
    } catch {}
  }, [opslagSleutel, hersteld, a, stap, bereikt, hermeting, resultaat]);

  function gaNaar(i: number) {
    setFout(null);
    setToonFouten(false);
    setStap(i);
    setBereikt((b) => Math.max(b, i));
    kop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function volgende() {
    const f = stapFout(STAPPEN[stap], a);
    if (f) {
      setFout(f);
      setToonFouten(true);
      return;
    }
    if (stap === 0 && bereikt === 0) meet(GEBEURTENISSEN.testGestart);
    gaNaar(stap + 1);
  }

  /** Mag de bezoeker via de tabbladen naar stap i springen? */
  function bereikbaar(i: number): boolean {
    return isBereikbaar(i, bereikt, STAPPEN, a);
  }

  async function verstuur() {
    const eersteFout = STAPPEN.findIndex((s) => stapFout(s, a) !== null);
    if (eersteFout !== -1) {
      gaNaar(eersteFout);
      setFout(stapFout(STAPPEN[eersteFout], a));
      setToonFouten(true);
      return;
    }
    setBezig(true);
    setFout(null);
    setMelding(null);
    setBevindingen([]);
    const payload = maakPayload(a, maatVelden, vragen, hermeting, vraagBandmaat);

    try {
      const res = await fetch(`/api/test/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        setFout(d.fout || "Er ging iets mis. Probeer het opnieuw.");
      } else if (d.soort === "opnieuw_meten") {
        setBevindingen(d.bevindingen);
        gaNaar(EERSTE_MATEN_STAP);
      } else if (d.soort === "silhouet_verschil") {
        setHermeting(true);
        gaNaar(EERSTE_MATEN_STAP);
        setMelding(silhouetVerschilMelding(silhouetten, a.silhouet, d.berekendeLetter, d.reden));
      } else {
        try {
          localStorage.removeItem(opslagSleutel);
        } catch {}
        meet(GEBEURTENISSEN.testAfgerond);
        setResultaat(d);
      }
    } catch {
      setFout("Kon de test niet versturen. Controleer je internetverbinding en probeer het opnieuw.");
    }
    setBezig(false);
  }

  return {
    stappen: STAPPEN,
    maatVelden,
    vragen,
    a,
    setA,
    stap,
    toonFouten,
    bezig,
    fout,
    melding,
    bevindingen,
    resultaat,
    kop,
    gaNaar,
    volgende,
    bereikbaar,
    verstuur,
  };
}
