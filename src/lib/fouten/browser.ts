// Fouten uit de browser naar de eigen foutlog (/api/fouten). Alleen in de browser
// aanroepen (in effecten of event-handlers). Stuurt hooguit een paar meldingen per
// paginabezoek, elke melding één keer, en slaat ruis (extensies e.d.) over.

import { isBrowserRuis, MAX_BERICHT, MAX_STACK, ontleedFout, type BrowserMelding } from "./regels";

const MAX_PER_PAGINA = 5;
const gezien = new Set<string>();

export function meldBrowserFout(
  fout: unknown,
  extra: { soort?: BrowserMelding["soort"]; digest?: string | null; bestand?: string | null } = {},
): void {
  try {
    if (typeof window === "undefined" || gezien.size >= MAX_PER_PAGINA) return;
    const { bericht, stack, naam } = ontleedFout(fout);
    const tekst = naam && !bericht.startsWith(naam) ? `${naam}: ${bericht}` : bericht;
    if (isBrowserRuis(tekst, stack, extra.bestand)) return;
    // Scripts van andere domeinen (bijv. statistiek) zijn niet van ons.
    if (extra.bestand && /^https?:\/\//.test(extra.bestand) && !extra.bestand.startsWith(window.location.origin)) return;
    const sleutel = `${tekst}\n${stack?.split("\n")[1] ?? ""}`;
    if (gezien.has(sleutel)) return;
    gezien.add(sleutel);

    const lichaam: Partial<BrowserMelding> = {
      bericht: tekst.slice(0, MAX_BERICHT),
      stack: stack?.slice(0, MAX_STACK) ?? null,
      pad: window.location.pathname,
      soort: extra.soort ?? "fout",
      digest: extra.digest ?? null,
      bestand: extra.bestand ?? null,
    };
    void fetch("/api/fouten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lichaam),
      keepalive: true,
      credentials: "omit",
    }).catch(() => undefined);
  } catch {
    // Rapporteren mag nooit zelf een fout geven.
  }
}
