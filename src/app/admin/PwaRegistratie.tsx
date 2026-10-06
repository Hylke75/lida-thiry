"use client";

import { useEffect } from "react";

/**
 * Registreert de service worker (public/sw.js) voor het beheer. Alleen op
 * beheerpagina's (staat in de beheernavigatie) en alleen met scope /admin,
 * zodat de openbare site er niets van merkt. Toont niets.
 */
export function PwaRegistratie() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/admin", updateViaCache: "none" }).catch(() => undefined);
  }, []);
  return null;
}
