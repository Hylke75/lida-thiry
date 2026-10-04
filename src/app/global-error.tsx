"use client";

import { useEffect } from "react";
import { meldBrowserFout } from "@/lib/fouten/browser";

// Laatste vangnet: als zelfs de root-layout faalt. Vervangt de hele pagina, dus
// eigen <html>/<body> en eenvoudige inline stijl in de huisstijlkleuren; geen
// database, geen technische details voor bezoekers.

const ACHTERGROND = "#faf8f5";
const TEKST = "#2b2a28";
const ACCENT = "#945843";

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
    // Serverfouten (met digest) staan al in de foutlog via instrumentation.ts.
    if (!error.digest) meldBrowserFout(error, { soort: "foutpagina" });
  }, [error]);

  return (
    <html lang="nl">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: ACHTERGROND,
          color: TEKST,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <title>Er ging iets mis · Lida Thiry</title>
        <main style={{ maxWidth: 520 }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 600, margin: "0 0 12px" }}>
            Er ging even iets mis
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.6, opacity: 0.75, margin: "0 0 28px" }}>
            Sorry, de website kon niet goed geladen worden. Probeer het nog eens; lukt het dan nog niet, kom dan later
            terug.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: ACCENT,
              color: ACHTERGROND,
              border: 0,
              borderRadius: 999,
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Opnieuw proberen
          </button>
          <p style={{ marginTop: 20 }}>
            {/* Gewone link: de router is hier mogelijk zelf stuk. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: ACCENT }}>
              Naar de homepage
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
