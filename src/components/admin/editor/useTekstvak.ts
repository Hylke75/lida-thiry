"use client";

import { useEffect, useEffectEvent, useState, type RefObject } from "react";
import { fotoplekBijCursor, pasOpmaakToe, voegAfbeeldingIn, type Opmaakknop } from "@/lib/blog/beheer";
import { isOpslaanToets } from "./regels";

export type EditorTab = "schrijven" | "voorbeeld";

/** Waarschuwt de browser bij weggaan zolang er niet-opgeslagen wijzigingen zijn. */
export function useWaarschuwBijWeggaan(gewijzigd: boolean) {
  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);
}

/** Ctrl/Cmd+S = opslaan. */
export function useOpslaanSneltoets(opslaan: () => unknown) {
  const opToets = useEffectEvent((e: KeyboardEvent) => {
    if (isOpslaanToets(e)) {
      e.preventDefault();
      void opslaan();
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => opToets(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
}

/**
 * Het tekstvak van de editor: selectie lezen en zetten, opmaak toepassen en foto's invoegen.
 * `zetInhoud` wordt aangeroepen met de nieuwe tekst (en markeert de editor als gewijzigd).
 * De ref van het tekstvak maakt het component zelf aan (en geeft hem aan `<textarea ref>`).
 */
export function useTekstvak(tekstvak: RefObject<HTMLTextAreaElement | null>, inhoud: string, zetInhoud: (inhoud: string) => void) {
  const [tab, setTab] = useState<EditorTab>("schrijven");
  const [foto, setFoto] = useState<{ alt: string } | null>(null);

  function selectie(): { start: number; eind: number } {
    const el = tekstvak.current;
    return el ? { start: el.selectionStart, eind: el.selectionEnd } : { start: inhoud.length, eind: inhoud.length };
  }

  function selecteer(start: number, eind: number) {
    setTab("schrijven");
    requestAnimationFrame(() => {
      const el = tekstvak.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, eind);
    });
  }

  function werkbalk(knop: Opmaakknop) {
    const { start, eind } = selectie();
    const r = pasOpmaakToe(inhoud, start, eind, knop);
    zetInhoud(r.tekst);
    selecteer(r.start, r.eind);
  }

  /** Voegt een tekstblok in en zet de cursor erachter (zie `voegBlokIn` in de pagina-editor). */
  function voegIn(maak: (tekst: string, start: number, eind: number) => { tekst: string; eind: number }) {
    const { start, eind } = selectie();
    const r = maak(inhoud, start, eind);
    zetInhoud(r.tekst);
    selecteer(r.eind, r.eind);
  }

  function openFoto() {
    const { start, eind } = selectie();
    setFoto({ alt: fotoplekBijCursor(inhoud, start, eind) ?? "" });
  }

  function fotoIngevoegd(fotoUrl: string, altUitBibliotheek = "") {
    const { start, eind } = selectie();
    const r = voegAfbeeldingIn(inhoud, start, eind, fotoUrl, foto?.alt.trim() || altUitBibliotheek);
    zetInhoud(r.tekst);
    setFoto(null);
    selecteer(r.eind, r.eind);
  }

  return {
    tab,
    setTab,
    foto,
    setFoto,
    selectie,
    selecteer,
    werkbalk,
    voegIn,
    openFoto,
    fotoIngevoegd,
    schrijfKolom: tab === "schrijven" ? "flex" : "hidden lg:flex",
    voorbeeldKolom: tab === "voorbeeld" ? "flex" : "hidden lg:flex",
  };
}
