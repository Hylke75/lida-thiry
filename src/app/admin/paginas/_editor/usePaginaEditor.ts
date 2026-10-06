"use client";

import { useMemo, useState, type RefObject } from "react";
import { useRouter } from "next/navigation";
import { vindPlaatshouders } from "@/lib/blog/beheer";
import { publicatieProblemen, slugFout, slugSuggestie, valideerPagina, type FormulierKeuze, type Pagina } from "@/lib/paginas/beheer";
import { onbekendeBlokken } from "@/lib/paginas/regels";
import type { Melding } from "@/components/admin/editor/onderdelen";
import { useOpslaanSneltoets, useTekstvak, useWaarschuwBijWeggaan } from "@/components/admin/editor/useTekstvak";
import { paginaNaarConcept, publiceerPagina, slaPaginaOp, type PaginaUitkomst } from "../acties";
import { zetPaginaVersieTerug } from "../../versies/acties";
import { alsInvoer, alsVelden, slugVolgtTitel, type Velden } from "./velden";

/** Alle toestand en acties van de pagina-editor. */
export function usePaginaEditor({
  pagina,
  formulieren,
  site,
  tekstvak,
}: {
  pagina: Pagina;
  formulieren: FormulierKeuze[];
  site: string;
  tekstvak: RefObject<HTMLTextAreaElement | null>;
}) {
  const router = useRouter();
  const [opgeslagen, setOpgeslagen] = useState(pagina);
  const [v, setV] = useState<Velden>(() => alsVelden(pagina));
  const [gewijzigd, setGewijzigd] = useState(false);
  const [slugAuto, setSlugAuto] = useState(slugVolgtTitel(pagina));
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<Melding | null>(null);

  const id = opgeslagen.id;
  const online = opgeslagen.status === "gepubliceerd";
  const url = `${site}/${v.slug || slugSuggestie(v.titel)}`;
  const formulierSlugs = useMemo(() => formulieren.map((f) => f.slug), [formulieren]);
  const onbekend = useMemo(() => onbekendeBlokken(v.inhoud, formulierSlugs), [v.inhoud, formulierSlugs]);
  const plekken = useMemo(() => vindPlaatshouders(`${v.intro}\n${v.inhoud}`), [v.intro, v.inhoud]);
  const validatie = useMemo(() => valideerPagina(alsInvoer(v)), [v]);
  const problemen = useMemo(
    () => [...(validatie.ok ? [] : validatie.fouten), ...publicatieProblemen({ titel: v.titel, intro: v.intro, inhoud: v.inhoud })],
    [validatie, v.titel, v.intro, v.inhoud],
  );
  const slugMelding = slugFout(v.slug);

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useWaarschuwBijWeggaan(gewijzigd);

  const zet = (w: Partial<Velden>) => {
    setV((oud) => ({ ...oud, ...w }));
    setGewijzigd(true);
    setMelding(null);
  };
  const zetTitel = (titel: string) => zet(slugAuto ? { titel, slug: slugSuggestie(titel) } : { titel });
  const tekst = useTekstvak(tekstvak, v.inhoud, (inhoud) => zet({ inhoud }));

  function verwerk(r: PaginaUitkomst, alleenStatus = false) {
    if (!r.ok) return setMelding({ soort: "fout", tekst: r.fouten });
    setOpgeslagen(r.pagina);
    if (alleenStatus) {
      setMelding({ soort: "ok", tekst: [r.melding, "Let op: je andere wijzigingen zijn nog niet opgeslagen."] });
    } else {
      setV(alsVelden(r.pagina));
      setGewijzigd(false);
      setMelding({ soort: "ok", tekst: [r.melding] });
      if (r.pagina.status === "gepubliceerd") setSlugAuto(false);
    }
    router.refresh();
  }

  async function voerUit(label: string, actie: () => Promise<PaginaUitkomst>, alleenStatus = false) {
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

  const opslaan = () => voerUit("opslaan", () => slaPaginaOp(id, alsInvoer(v)));

  /** Zet een versie uit de geschiedenis terug; null = gelukt, anders de foutmeldingen. */
  async function versieTerugzetten(versieId: string): Promise<string[] | null> {
    const r = await zetPaginaVersieTerug(versieId);
    if (!r.ok) return r.fouten;
    verwerk(r);
    return null;
  }

  // Ctrl/Cmd+S = opslaan.
  useOpslaanSneltoets(opslaan);

  // Publiceren ------------------------------------------------------------------------

  const kanPubliceren = problemen.length === 0 && !bezig;
  const nuPubliceren = () => {
    if (!confirm("De pagina nu publiceren? Hij is daarna direct zichtbaar op je website.")) return;
    void voerUit("publiceren", () => publiceerPagina(id, alsInvoer(v)));
  };
  const offline = () => {
    if (gewijzigd && !confirm("Je hebt wijzigingen die nog niet zijn opgeslagen. Die blijven in de editor staan; vergeet niet daarna op te slaan. Doorgaan?")) return;
    if (!confirm("De pagina offline halen? Hij is dan niet meer te zien op je website (ook niet in het menu).")) return;
    void voerUit("concept", () => paginaNaarConcept(id), gewijzigd);
  };

  return {
    id,
    opgeslagen,
    online,
    v,
    gewijzigd,
    slugAuto,
    setSlugAuto,
    bezig,
    melding,
    url,
    onbekend,
    plekken,
    problemen,
    slugMelding,
    zet,
    zetTitel,
    tekst,
    opslaan,
    versieTerugzetten,
    kanPubliceren,
    nuPubliceren,
    offline,
  };
}

export type PaginaEditorStaat = ReturnType<typeof usePaginaEditor>;
