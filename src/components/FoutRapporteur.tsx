"use client";

import { useEffect } from "react";
import { meldBrowserFout } from "@/lib/fouten/browser";

/**
 * Vangt onverwachte fouten in de browser (window.onerror en niet-afgehandelde
 * promises) en stuurt ze naar de eigen foutlog. Toont niets.
 */
export function FoutRapporteur() {
  useEffect(() => {
    const bijFout = (e: ErrorEvent) => {
      meldBrowserFout(e.error ?? e.message, { soort: "fout", bestand: e.filename || null });
    };
    const bijBelofte = (e: PromiseRejectionEvent) => {
      meldBrowserFout(e.reason, { soort: "belofte" });
    };
    window.addEventListener("error", bijFout);
    window.addEventListener("unhandledrejection", bijBelofte);
    return () => {
      window.removeEventListener("error", bijFout);
      window.removeEventListener("unhandledrejection", bijBelofte);
    };
  }, []);
  return null;
}
