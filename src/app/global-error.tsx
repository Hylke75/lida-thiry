"use client";

import { useEffect } from "react";
import { meldBrowserFout } from "@/lib/fouten/browser";

// Laatste vangnet: als zelfs de root-layout faalt. Vervangt de hele pagina, dus
// eigen <html>/<body> en eenvoudige inline stijl in de huisstijl (kleuren uit
// globals.css, lettertypen met terugval: de webfonts van de layout zijn hier
// mogelijk niet geladen); geen database, geen technische details voor bezoekers.

const PAPIER = "#fffdf9";
const INKT = "#2f2441";
const INKT_ZACHT = "#5d536a";
const BERRY = "#6f2d59";
const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS = "Manrope, system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";
/** Het kleurlint uit het ontwerp: koraal, boter, salie, lucht, lila. */
const LINT = ["#ff8877", "#f6d879", "#b8d3ae", "#b9d9ef", "#d8a7c6"];

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
          flexDirection: "column",
          background: "linear-gradient(108deg, #fff7ef 0%, #fffaf5 48%, #fdf2eb 100%)",
          backgroundColor: PAPIER,
          color: INKT,
          fontFamily: SANS,
          lineHeight: 1.65,
          textAlign: "center",
        }}
      >
        <title>Er ging iets mis · Lida Thiry</title>
        <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "68px 20px" }}>
          <div style={{ maxWidth: 620 }}>
            <p
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.13em",
                textTransform: "uppercase",
                color: BERRY,
              }}
            >
              Lida Thiry · Kleur- en stijladvies
            </p>
            <h1
              style={{
                fontFamily: SERIF,
                fontSize: "clamp(40px, 6vw, 64px)",
                fontWeight: 400,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
                margin: "0 0 20px",
              }}
            >
              Er ging even iets <em style={{ color: "#dc5a48" }}>mis</em>
            </h1>
            <p style={{ fontSize: 18, color: INKT_ZACHT, margin: "0 0 30px" }}>
              Sorry, de website kon niet goed geladen worden. Probeer het nog eens; lukt het dan nog niet, kom dan later
              terug.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{
                  background: BERRY,
                  color: "#ffffff",
                  border: `1px solid ${BERRY}`,
                  borderRadius: 999,
                  minHeight: 52,
                  padding: "0 22px",
                  fontFamily: SANS,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Opnieuw proberen
              </button>
              {/* Gewone link: de router is hier mogelijk zelf stuk. */}
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a
                href="/"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  minHeight: 52,
                  padding: "0 22px",
                  border: `1px solid ${BERRY}`,
                  borderRadius: 999,
                  color: BERRY,
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                Naar de homepage
              </a>
            </div>
          </div>
        </main>
        <div aria-hidden="true" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", height: 11 }}>
          {LINT.map((kleur) => (
            <span key={kleur} style={{ background: kleur }} />
          ))}
        </div>
      </body>
    </html>
  );
}
