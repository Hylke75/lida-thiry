"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { usePathname } from "next/navigation";
import { filterGebeurtenis, meetwijze } from "@/lib/analytics/regels";

/**
 * Anonieme bezoekersstatistieken via Vercel Web Analytics en Speed Insights:
 * zonder cookies en zonder persoonsgegevens (zie lib/analytics/regels.ts).
 * Uit in het beheer en bij inloggen; in de test alleen de gebeurtenissen
 * "test gestart" en "test afgerond", zonder paginaweergave en zonder de sleutel uit de url.
 */
export function Bezoekersstatistiek() {
  const wijze = meetwijze(usePathname());
  if (wijze === "uit") return null;
  return (
    <>
      <Analytics beforeSend={filterGebeurtenis} />
      {wijze === "volledig" && <SpeedInsights beforeSend={filterGebeurtenis} />}
    </>
  );
}
