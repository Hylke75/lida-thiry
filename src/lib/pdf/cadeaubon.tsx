import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatteerBedrag } from "@/lib/prijs";
import type { BonGegevens } from "@/lib/email-html";
import { datumLang } from "@/lib/datum";
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";
import { leesMerk } from "@/lib/merk";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn, type SectieWaarden } from "@/lib/inhoud/schema";
import { CADEAUBON_MAIL, CADEAUBON_PDF } from "@/lib/inhoud/groepen/cadeaubon";
import { EYEBROW, KLEUR, Kleurstrook, SANS, SERIF, Woordmerk, type Merk } from "./huisstijl";

const kleur = { tekst: KLEUR.ink, grijs: KLEUR.inkZacht, accent: KLEUR.berry, zacht: KLEUR.cream };

const s = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 34,
    paddingHorizontal: 48,
    fontSize: 10.5,
    color: kleur.tekst,
    fontFamily: SANS,
    lineHeight: 1.55,
    backgroundColor: kleur.zacht,
  },
  strookBoven: { position: "absolute", top: 0, left: 0, right: 0 },
  strookOnder: { position: "absolute", bottom: 0, left: 0, right: 0 },
  kader: {
    flexGrow: 1,
    borderWidth: 1,
    borderColor: KLEUR.lijn,
    borderRadius: 28,
    backgroundColor: KLEUR.paper,
    paddingVertical: 26,
    paddingHorizontal: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  titel: { fontFamily: SERIF, fontSize: 46, lineHeight: 1.05, marginTop: 20, color: kleur.tekst },
  sub: { fontSize: 11, color: kleur.grijs, marginTop: 6 },
  bedrag: { fontFamily: SERIF, fontSize: 50, lineHeight: 1.1, marginTop: 14, color: kleur.accent },
  voorVan: { fontSize: 12, color: kleur.grijs, marginTop: 4 },
  codeLabel: { ...EYEBROW, marginTop: 16 },
  code: {
    fontSize: 20,
    lineHeight: 1.2,
    fontFamily: "Courier-Bold",
    letterSpacing: 2,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 20,
    color: kleur.tekst,
    backgroundColor: KLEUR.wit,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: kleur.accent,
    borderRadius: 14,
  },
  geldig: { fontSize: 9.5, color: kleur.grijs, marginTop: 10 },
  boodschap: {
    marginTop: 14,
    maxWidth: 520,
    alignItems: "center",
    backgroundColor: KLEUR.coralZacht,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  boodschapLabel: { ...EYEBROW, marginBottom: 4 },
  boodschapTekst: { fontFamily: SERIF, fontStyle: "italic", fontSize: 13, lineHeight: 1.35, textAlign: "center" },
  uitleg: { marginTop: 14, fontSize: 9, color: kleur.grijs, textAlign: "center" },
});

/** De beheerbare teksten op de bon (Beheer → Teksten → Cadeaubon). */
export interface CadeaubonPdfTeksten {
  pdf: SectieWaarden<typeof CADEAUBON_PDF>;
  /** Voor/van, het label boven de code en boven de boodschap: gedeeld met de bon in de mail. */
  bon: Pick<SectieWaarden<typeof CADEAUBON_MAIL>, "bonVoor" | "bonVan" | "bonCodeLabel" | "boodschapLabel">;
}

/** De cadeaubon als PDF (A4 liggend), om te printen of door te sturen. */
function CadeaubonPdf({ b, bestelUrl, merk, teksten }: { b: BonGegevens; bestelUrl: string; merk: Merk; teksten: CadeaubonPdfTeksten }) {
  const { pdf, bon } = teksten;
  const voorVan = [
    b.ontvangerNaam ? vulIn(bon.bonVoor, { ontvanger: b.ontvangerNaam }) : "",
    b.koperNaam ? vulIn(bon.bonVan, { koper: b.koperNaam }) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const geldigTot = datumLang(b.geldigTot);
  return (
    <Document title={`Cadeaubon ${b.code}`} author={BEDRIJFSNAAM_STANDAARD}>
      <Page size="A4" orientation="landscape" style={s.page}>
        <Kleurstrook hoogte={10} style={s.strookBoven} />
        <Kleurstrook hoogte={10} style={s.strookOnder} />
        <View style={s.kader} wrap={false}>
          <Woordmerk merk={merk} grootte={14} midden />
          <Text style={s.titel}>{pdf.titel}</Text>
          {pdf.ondertitel ? <Text style={s.sub}>{pdf.ondertitel}</Text> : null}
          <Text style={s.bedrag}>{formatteerBedrag(b.bedragCent, b.valuta)}</Text>
          {voorVan ? <Text style={s.voorVan}>{voorVan}</Text> : null}
          <Text style={s.codeLabel}>{bon.bonCodeLabel}</Text>
          <Text style={s.code}>{b.code}</Text>
          <Text style={s.geldig}>{vulIn(pdf.geldig, { geldig_tot: geldigTot })}</Text>
          {b.boodschap?.trim() ? (
            <View style={s.boodschap}>
              <Text style={s.boodschapLabel}>{bon.boodschapLabel}</Text>
              <Text style={s.boodschapTekst}>“{b.boodschap.trim()}”</Text>
            </View>
          ) : null}
          {pdf.uitleg ? (
            <Text style={s.uitleg}>
              {vulIn(pdf.uitleg, { adres: bestelUrl.replace(/^https?:\/\//, ""), geldig_tot: geldigTot })}
            </Text>
          ) : null}
        </View>
      </Page>
    </Document>
  );
}

/** Leest de teksten op de bon (gecachet, met de standaardtekst als terugval). */
async function leesCadeaubonPdfTeksten(): Promise<CadeaubonPdfTeksten> {
  const [pdf, bon] = await Promise.all([leesSectie(CADEAUBON_PDF), leesSectie(CADEAUBON_MAIL)]);
  return { pdf, bon };
}

/**
 * Rendert de cadeaubon naar PDF-bytes. Woordmerk en teksten zoals op de site
 * (Beheer → Teksten → Cadeaubon), tenzij meegegeven.
 */
export async function maakCadeaubonPdf(
  b: BonGegevens,
  bestelUrl: string,
  merk?: Merk,
  teksten?: CadeaubonPdfTeksten,
): Promise<Buffer> {
  const [m, t] = await Promise.all([merk ?? leesMerk(), teksten ?? leesCadeaubonPdfTeksten()]);
  return renderToBuffer(<CadeaubonPdf b={b} bestelUrl={bestelUrl} merk={m} teksten={t} />);
}
