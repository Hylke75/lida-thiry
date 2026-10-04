"use client";

import { useEffect, useRef } from "react";

/** Of de toets in een invoerveld is getypt (dan geen sneltoets). */
function inInvoer(doel: EventTarget | null): boolean {
  if (!(doel instanceof HTMLElement)) return false;
  return doel.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(doel.tagName);
}

/**
 * Zoekvak in de beheernavigatie: stuurt naar /admin/zoeken?q=…
 * Sneltoetsen `/` en Ctrl/⌘+K zetten de cursor in het (zichtbare) zoekvak.
 */
export function ZoekVeld({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function toets(e: KeyboardEvent) {
      const veld = ref.current;
      // Er staan twee zoekvakken in de navigatie (telefoon en groot scherm); alleen het zichtbare reageert.
      if (!veld || veld.getClientRects().length === 0) return;
      const ctrlK = (e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !inInvoer(e.target);
      if (!ctrlK && !slash) return;
      e.preventDefault();
      veld.focus();
      veld.select();
    }
    document.addEventListener("keydown", toets);
    return () => document.removeEventListener("keydown", toets);
  }, []);

  return (
    <form action="/admin/zoeken" method="get" role="search" className={className}>
      <input
        ref={ref}
        type="search"
        name="q"
        required
        minLength={2}
        maxLength={100}
        placeholder="Zoeken…  /"
        aria-label="Zoeken in het beheer (sneltoets / of Ctrl+K)"
        aria-keyshortcuts="/ Control+K Meta+K"
        onKeyDown={(e) => {
          if (e.key === "Escape") e.currentTarget.blur();
        }}
        className="w-full rounded-full border border-black/15 bg-kaart px-3 py-1.5 text-sm outline-none focus:border-accent dark:border-white/20"
      />
    </form>
  );
}
