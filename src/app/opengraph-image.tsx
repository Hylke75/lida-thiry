import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";
import { KLEUR, STROOK } from "@/lib/huisstijl";
import { leesMerk } from "@/lib/merk";
import { deelbeeldKop } from "@/lib/seo/delen";
import { leesWebsite } from "@/lib/website/lees";

export const alt = `${BEDRIJFSNAAM_STANDAARD} — ontdek je figuurtype`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Het woordmerk (naam en subregel) komt uit het beheer: elk uur vernieuwen, net als de homepage.
export const revalidate = 3600;

/**
 * De lettertypen van de huisstijl (dezelfde TTF's als voor de PDF's, SIL OFL).
 * next/og leest TTF/OTF/WOFF; het pad staat in outputFileTracingIncludes (next.config.ts).
 */
const MAP = join(process.cwd(), "src", "lib", "pdf", "fonts");

export default async function OpengraphImage() {
  const [serif, serifCursief, sans, sansVet, merk, site] = await Promise.all([
    readFile(join(MAP, "DMSerifDisplay-Regular.ttf")),
    readFile(join(MAP, "DMSerifDisplay-Italic.ttf")),
    readFile(join(MAP, "Manrope-Regular.ttf")),
    readFile(join(MAP, "Manrope-Bold.ttf")),
    leesMerk(),
    leesWebsite(),
  ]);
  // De titel bij delen (Beheer → Website → Instellingen), het laatste woord als accent.
  const kop = deelbeeldKop(site.deelTitel);
  const stappen: [string, string][] = [
    ["Meten", KLEUR.sage],
    ["vragen beantwoorden", KLEUR.butter],
    ["advies ontvangen", KLEUR.sky],
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: KLEUR.cream,
          fontFamily: "Manrope",
          color: KLEUR.ink,
        }}
      >
        {/* Kleurstrook */}
        <div style={{ display: "flex", height: 14 }}>
          {STROOK.map((k) => (
            <div key={k} style={{ flex: 1, background: k }} />
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "60px 80px 64px",
          }}
        >
          {/* Woordmerk, met rechts kleine kleurstalen */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: 1.5, lineHeight: 1 }}>
                {merk.naam.toLocaleUpperCase("nl")}
              </div>
              {merk.subregel ? (
                <div
                  style={{
                    display: "flex",
                    marginTop: 10,
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 3.2,
                    lineHeight: 1,
                    color: KLEUR.inkZacht,
                  }}
                >
                  {merk.subregel.toLocaleUpperCase("nl")}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex" }}>
              {STROOK.map((k) => (
                <div key={k} style={{ width: 30, height: 30, borderRadius: 15, background: k, marginLeft: 10 }} />
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexWrap: "wrap", fontFamily: "DM Serif Display", fontSize: kop.grootte, lineHeight: 1.04 }}>
              {kop.voor ? `${kop.voor} ` : null}
              <span style={{ fontStyle: "italic", color: KLEUR.coralTekst }}>{kop.accent}</span>
            </div>
            <div style={{ display: "flex", marginTop: 22, fontSize: 34, lineHeight: 1.35, color: KLEUR.inkZacht }}>
              Online kledingadviestest — direct je persoonlijke advies als PDF
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", fontSize: 26, fontWeight: 700 }}>
            {stappen.map(([tekst, kleur]) => (
              <div key={tekst} style={{ display: "flex", alignItems: "center", marginRight: 40, flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: 9, background: kleur, marginRight: 12 }} />
                {tekst}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Serif Display", data: serif, style: "normal", weight: 400 },
        { name: "DM Serif Display", data: serifCursief, style: "italic", weight: 400 },
        { name: "Manrope", data: sans, style: "normal", weight: 400 },
        { name: "Manrope", data: sansVet, style: "normal", weight: 700 },
      ],
    },
  );
}
