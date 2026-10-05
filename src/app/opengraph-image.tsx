import { ImageResponse } from "next/og";
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";

export const alt = `${BEDRIJFSNAAM_STANDAARD} — ontdek je figuurtype`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Huisstijlkleuren (gelijk aan globals.css, lichte modus).
const ACHTERGROND = "#faf8f5";
const TEKST = "#2b2a28";
const ACCENT = "#a4634d";
const ACCENT_ZACHT = "#f3e6df";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: ACHTERGROND,
          padding: "72px 80px",
          borderLeft: `24px solid ${ACCENT}`,
          fontFamily: "serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 20,
              background: ACCENT,
              color: ACHTERGROND,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 700,
            }}
          >
            LT
          </div>
          <div style={{ display: "flex", fontSize: 30, color: ACCENT, letterSpacing: 2 }}>
            LIDA THIRY · IMAGO &amp; KLEDINGADVIES
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, lineHeight: 1.1, color: TEKST }}>
            Ontdek je figuurtype
          </div>
          <div style={{ display: "flex", fontSize: 36, color: TEKST, opacity: 0.7 }}>
            Online kledingadviestest — direct je persoonlijke advies als PDF
          </div>
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            background: ACCENT_ZACHT,
            color: ACCENT,
            borderRadius: 999,
            padding: "14px 32px",
            fontSize: 28,
          }}
        >
          Meten · vragen beantwoorden · advies ontvangen
        </div>
      </div>
    ),
    size,
  );
}
