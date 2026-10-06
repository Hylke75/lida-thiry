// Rendert de PDF's (advies, cadeaubon, factuur) met voorbeeldgegevens in de
// huisstijl: controleert dat ze renderen en dat de eigen lettertypen erin zitten.
// Met PDF_VOORBEELD_MAP=<map> worden de PDF's ook bewaard (om te bekijken of om
// schermafbeeldingen te maken, zie docs/ontwerp/screenshots).

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { AdviesPdf, type AdviesPdfProps } from "../pdf/document";
import { maakCadeaubonPdf } from "../pdf/cadeaubon";
import { maakFactuurPdf } from "../pdf/factuur";
import { vormUitMaten } from "../lichaam-pad";
import { MERK_STANDAARD } from "../huisstijl";

const MAP = process.env.PDF_VOORBEELD_MAP;

function bewaar(naam: string, pdf: Buffer) {
  if (!MAP) return;
  mkdirSync(MAP, { recursive: true });
  writeFileSync(path.join(MAP, naam), pdf);
}

/** De lettertypen staan als ingesloten subset in de PDF (naam met prefix, bijv. ABCDEF+Manrope-Bold). */
function lettertypen(pdf: Buffer): string[] {
  return [...new Set(pdf.toString("latin1").match(/\/BaseFont\s*\/[A-Z]{6}\+[A-Za-z-]+/g) ?? [])];
}

async function voorbeeldBeeld(kleur: string): Promise<string> {
  const png = await sharp({ create: { width: 200, height: 300, channels: 3, background: kleur } }).png().toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

describe("PDF's in de huisstijl", () => {
  it("advies: voorpagina met silhouet en maten, daarna inhoud en secties", async () => {
    const props: AdviesPdfProps = {
      klantnaam: "Anna de Vries",
      datum: "6 oktober 2026",
      sleutel: "X2",
      titel: "Zandloper met een korte taille",
      maten: {
        lengte_cm: 168,
        gewicht_kg: 64,
        borst: 94,
        taille: 72,
        hoge_heup: 88,
        heup: 100,
        binnenbeen: 78,
        schouder: 106,
      },
      silhouet: {
        naam: "Zandloper",
        uitleg:
          "Je schouders en heupen zijn ongeveer even breed en je taille is duidelijk smaller. Kleding die de taille volgt, laat die mooie lijn het best zien.",
        eigenMaten: true,
        vorm: vormUitMaten({ borst: 94, taille: 72, hogeHeup: 88, heup: 100, schouder: 106 }),
      },
      secties: [
        {
          kop: "Jouw figuur in het kort",
          tekst:
            "Je hebt een **evenwichtig** figuur met een duidelijke taille. Dat maakt veel mogelijk.\n\n- Benadruk je taille met een riem of een getailleerd jasje\n- Kies stoffen die soepel vallen\n- **Wikkeljurken** zijn een gouden greep\n\n*Tip: draag een riem net boven je natuurlijke taille.*",
        },
        {
          kop: "Broeken",
          tekst:
            "**Bootcut**: verlengt je benen en houdt je silhouet in balans.\n\n**Rechte pijp**: rustig en tijdloos; mooi met een korte enkellaars.\n\nVermijd broeken met veel volume rond de heup.",
          beelden: await Promise.all(
            [
              ["#B9D9EF", "Bootcut in donkere denim"],
              ["#B8D3AE", "Rechte pijp"],
              ["#F6D879", "Wijde pijp met hoge taille"],
              ["#D8A7C6", "Pantalon met plooi"],
            ].map(async ([k, bijschrift]) => ({ src: await voorbeeldBeeld(k), bijschrift })),
          ),
        },
        {
          kop: "Jurken en rokken",
          tekst: Array.from({ length: 6 }, () =>
            "Een jurk die de taille volgt, is voor jou de makkelijkste keuze. Let op de lengte: net onder de knie werkt vaak het best. Combineer met een open schoen of een pump met een lage hak.",
          ).join("\n\n"),
        },
        { kop: "Jassen", tekst: "- Getailleerde blazer\n- Trenchcoat met ceintuur\n- Korte jas tot op de heup" },
      ],
      merk: MERK_STANDAARD,
    };
    const pdf = await renderToBuffer(createElement(AdviesPdf, props) as Parameters<typeof renderToBuffer>[0]);
    bewaar("advies.pdf", pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    const fonts = lettertypen(pdf).join(" ");
    expect(fonts).toMatch(/DMSerifDisplay-Regular/);
    expect(fonts).toMatch(/Manrope-Regular/);
    expect(fonts).toMatch(/Manrope-Bold/);
    expect(fonts).not.toMatch(/Helvetica|Times/);
  }, 30_000);

  it("cadeaubon (A4 liggend) met boodschap", async () => {
    const pdf = await maakCadeaubonPdf(
      {
        koperNaam: "Marieke",
        ontvangerNaam: "Sanne",
        bedragCent: 4995,
        valuta: "EUR",
        code: "LT-7K4P-QX9M",
        geldigTot: "2027-10-06",
        boodschap: "Gefeliciteerd met je verjaardag! Veel plezier met je persoonlijke advies.",
      },
      "https://www.lidathiry.nl/bestellen",
      MERK_STANDAARD,
    );
    bewaar("cadeaubon.pdf", pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(lettertypen(pdf).join(" ")).toMatch(/DMSerifDisplay-Regular/);
  }, 30_000);

  it("factuur met korting", async () => {
    const pdf = await maakFactuurPdf(
      {
        factuurnummer: "2026-0042",
        factuurdatum: "6 oktober 2026",
        betaaldOp: "6 oktober 2026",
        verkoper: {
          naam: "Lida Thiry Imago & Kledingadvies",
          adres: "Voorbeeldstraat 1\n1234 AB Voorbeeldstad",
          kvk: "12345678",
          btw: "NL001234567B01",
          email: "info@example.nl",
        },
        koper: { naam: "Anna de Vries", email: "anna@example.nl", adresregels: ["Laan 5", "5678 CD Ergens"] },
        omschrijving: "Persoonlijke kledingadviestest",
        prijsCent: 4995,
        kortingCent: 500,
        kortingscode: "WELKOM",
        totaalCent: 4495,
        valuta: "EUR",
        btwProcent: 21,
      },
      MERK_STANDAARD,
    );
    bewaar("factuur.pdf", pdf);
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(lettertypen(pdf).join(" ")).toMatch(/Manrope-Bold/);
  }, 30_000);
});
