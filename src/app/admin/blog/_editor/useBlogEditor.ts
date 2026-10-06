"use client";

import { useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { vindPlaatshouders } from "@/lib/blog/beheer";
import { publicatieProblemen, valideerBericht, type BlogBericht, type Zichtbaarheid } from "@/lib/blog/regels";
import { slugify } from "@/lib/slug";
import type { Melding } from "@/components/admin/editor/onderdelen";
import { useOpslaanSneltoets, useTekstvak, useWaarschuwBijWeggaan } from "@/components/admin/editor/useTekstvak";
import { naarConcept, publiceer, slaBerichtOp, type BerichtUitkomst } from "../acties";
import { zetBerichtVersieTerug } from "../../versies/acties";
import { alsInvoer, alsVelden, slugVolgtTitel, type Velden } from "./velden";

/** Alle toestand en acties van de blogeditor (behalve de AI-hulp, zie useAiHulp). */
export function useBlogEditor({
  bericht,
  beginZichtbaar,
  site,
  standaardMoment,
  tekstvak,
}: {
  bericht: BlogBericht;
  beginZichtbaar: Zichtbaarheid;
  site: string;
  standaardMoment: string;
  tekstvak: RefObject<HTMLTextAreaElement | null>;
}) {
  const router = useRouter();
  const [opgeslagen, setOpgeslagen] = useState(bericht);
  const [zichtbaar, setZichtbaar] = useState(beginZichtbaar);
  const [v, setV] = useState<Velden>(() => alsVelden(bericht));
  const [gewijzigd, setGewijzigd] = useState(false);
  const [slugAuto, setSlugAuto] = useState(slugVolgtTitel(bericht, beginZichtbaar));
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<Melding | null>(null);
  const [moment, setMoment] = useState(standaardMoment);
  const [gecontroleerd, setGecontroleerd] = useState(false);

  const id = opgeslagen.id;
  const url = `${site}/blog/${v.slug || slugify(v.titel)}`;
  const plekken = useMemo(() => vindPlaatshouders(v.inhoud), [v.inhoud]);
  const validatie = useMemo(() => valideerBericht(alsInvoer(v)), [v]);
  const problemen = useMemo(
    () => [...(validatie.ok ? [] : validatie.fouten), ...publicatieProblemen({ titel: v.titel, inhoud: v.inhoud, samenvatting: v.samenvatting })],
    [validatie, v.titel, v.inhoud, v.samenvatting],
  );
  const nogTeControleren = opgeslagen.ai_gegenereerd && !opgeslagen.ai_opdracht?.gecontroleerd_op;
  const omslagSuggestie = typeof opgeslagen.ai_opdracht?.omslag_suggestie === "string" ? opgeslagen.ai_opdracht.omslag_suggestie : "";

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useWaarschuwBijWeggaan(gewijzigd);

  const zet = (w: Partial<Velden>) => {
    setV((oud) => ({ ...oud, ...w }));
    setGewijzigd(true);
    setMelding(null);
  };
  const zetTitel = (titel: string) => zet(slugAuto ? { titel, slug: slugify(titel) } : { titel });
  const tekst = useTekstvak(tekstvak, v.inhoud, (inhoud) => zet({ inhoud }));

  /** Verwerkt het antwoord van de server; met `alleenStatus` blijft niet-opgeslagen tekst in de editor staan. */
  function verwerk(r: BerichtUitkomst, alleenStatus = false) {
    if (r.ok) {
      setOpgeslagen(r.bericht);
      setZichtbaar(r.zichtbaar);
      if (alleenStatus) {
        setMelding({ soort: "ok", tekst: [r.melding, "Let op: je andere wijzigingen zijn nog niet opgeslagen."] });
        router.refresh();
        return;
      }
      setV(alsVelden(r.bericht));
      setGewijzigd(false);
      setMelding({ soort: "ok", tekst: [r.melding] });
      if (r.zichtbaar !== "concept") setSlugAuto(false);
      router.refresh();
    } else {
      setMelding({ soort: "fout", tekst: r.fouten });
    }
  }

  async function voerUit(label: string, actie: () => Promise<BerichtUitkomst>, alleenStatus = false) {
    if (bezig) return;
    setBezig(label);
    setMelding(null);
    try {
      verwerk(await actie(), alleenStatus);
    } catch {
      setMelding({ soort: "fout", tekst: ["Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw."] });
    } finally {
      setBezig(null);
    }
  }

  const opslaan = () => voerUit("opslaan", () => slaBerichtOp(id, alsInvoer(v)));

  /** Zet een versie uit de geschiedenis terug; null = gelukt, anders de foutmeldingen. */
  async function versieTerugzetten(versieId: string): Promise<string[] | null> {
    const r = await zetBerichtVersieTerug(versieId);
    if (!r.ok) return r.fouten;
    verwerk(r);
    return null;
  }

  // Ctrl/Cmd+S = opslaan.
  useOpslaanSneltoets(opslaan);

  // Publiceren ------------------------------------------------------------------------

  const kanPubliceren = problemen.length === 0 && (!nogTeControleren || gecontroleerd) && !bezig;

  const nuPubliceren = () => {
    if (!confirm(zichtbaar === "ingepland" ? "Het bericht nu meteen publiceren in plaats van op het geplande moment?" : "Het bericht nu publiceren? Het is daarna direct zichtbaar op je website.")) return;
    void voerUit("publiceren", () => publiceer(id, alsInvoer(v), { moment: null, gecontroleerd }));
  };
  const inplannen = () => void voerUit("inplannen", () => publiceer(id, alsInvoer(v), { moment, gecontroleerd }));
  const terugNaarConcept = () => {
    if (gewijzigd && !confirm("Je hebt wijzigingen die nog niet zijn opgeslagen. Die blijven in de editor staan; vergeet niet daarna op te slaan. Doorgaan?")) return;
    if (zichtbaar === "online" && !confirm("Het bericht offline halen? Het is dan niet meer te zien op je website.")) return;
    // Niet-opgeslagen tekst blijft staan: dan alleen de nieuwe status overnemen.
    void voerUit("concept", () => naarConcept(id), gewijzigd);
  };

  return {
    id,
    opgeslagen,
    zichtbaar,
    v,
    gewijzigd,
    slugAuto,
    setSlugAuto,
    bezig,
    melding,
    moment,
    setMoment,
    gecontroleerd,
    setGecontroleerd,
    url,
    plekken,
    problemen,
    nogTeControleren,
    omslagSuggestie,
    zet,
    zetTitel,
    tekst,
    opslaan,
    versieTerugzetten,
    kanPubliceren,
    nuPubliceren,
    inplannen,
    terugNaarConcept,
  };
}

export type BlogEditorStaat = ReturnType<typeof useBlogEditor>;
