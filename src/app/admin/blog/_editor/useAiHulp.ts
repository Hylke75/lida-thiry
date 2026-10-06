"use client";

import { useState, type RefObject } from "react";
import type { Suggesties } from "@/lib/blog/ai";
import type { Bewerking } from "@/lib/blog/ai-prompt";
import { aiBewerk, aiVoorstel } from "../acties";
import { aiBereik, BEWERKING_LABEL, pasAiVoorstelToe, type AiVoorstelTekst } from "./velden";
import type { BlogEditorStaat } from "./useBlogEditor";

/**
 * De AI-schrijfhulp van de blogeditor: tekst herschrijven en titels/SEO voorstellen.
 * `aiPaneel` is het paneel met het voorstel; daar scrollt de editor naartoe als het klaar is.
 */
export function useAiHulp({ id, v, zet, tekst }: Pick<BlogEditorStaat, "id" | "v" | "zet" | "tekst">, aiPaneel: RefObject<HTMLDivElement | null>) {
  const [aiBezig, setAiBezig] = useState<string | null>(null);
  const [aiFout, setAiFout] = useState<string | null>(null);
  const [aiTekst, setAiTekst] = useState<AiVoorstelTekst | null>(null);
  const [suggesties, setSuggesties] = useState<Suggesties | null>(null);

  async function aiHerschrijf(bewerking: Bewerking) {
    if (aiBezig) return;
    const { start, eind } = tekst.selectie();
    const { van, tot, voor, geheel } = aiBereik(v.inhoud, start, eind);
    if (!voor.trim()) return setAiFout("Er is nog geen tekst om te bewerken.");
    setAiFout(null);
    setAiTekst(null);
    setAiBezig(`${BEWERKING_LABEL[bewerking]}${geheel ? " (hele tekst)" : " (selectie)"}`);
    try {
      const r = await aiBewerk(id, bewerking, voor);
      if (r.ok) {
        setAiTekst({ bewerking, start: van, eind: tot, voor, na: r.tekst, geheel });
        requestAnimationFrame(() => aiPaneel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else setAiFout(r.fouten.join(" "));
    } catch {
      setAiFout("De AI reageerde niet op tijd of de verbinding viel weg. Probeer het opnieuw, eventueel met een kleiner stuk tekst.");
    } finally {
      setAiBezig(null);
    }
  }

  function aiOvernemen() {
    if (!aiTekst) return;
    const r = pasAiVoorstelToe(v.inhoud, aiTekst);
    if (!r) {
      return setAiFout("De tekst is intussen veranderd, waardoor het voorstel niet meer automatisch past. Kopieer het voorstel zelf, of vraag het opnieuw.");
    }
    zet({ inhoud: r.tekst });
    setAiTekst(null);
    tekst.selecteer(r.start, r.start + aiTekst.na.length);
  }

  async function aiSuggesties() {
    if (aiBezig) return;
    setAiFout(null);
    setSuggesties(null);
    setAiBezig("Titels & SEO bedenken");
    try {
      const r = await aiVoorstel(id, v.titel, v.inhoud);
      if (r.ok) setSuggesties(r.suggesties);
      else setAiFout(r.fouten.join(" "));
    } catch {
      setAiFout("De AI reageerde niet op tijd of de verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setAiBezig(null);
    }
  }

  return { aiBezig, aiFout, aiTekst, setAiTekst, suggesties, aiHerschrijf, aiOvernemen, aiSuggesties };
}

export type AiHulp = ReturnType<typeof useAiHulp>;
