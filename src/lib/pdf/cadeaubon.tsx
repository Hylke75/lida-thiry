import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatteerBedrag } from "@/lib/prijs";
import { datumLang, type BonGegevens } from "@/lib/email-html";

const kleur = { tekst: "#2b2a28", grijs: "#6b6b6b", accent: "#a4634d", zacht: "#f6efe9" };

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 11, color: kleur.tekst, fontFamily: "Helvetica", lineHeight: 1.5 },
  kader: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: kleur.accent,
    borderRadius: 16,
    backgroundColor: kleur.zacht,
    paddingVertical: 28,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  merk: { fontSize: 10, letterSpacing: 4, textTransform: "uppercase", color: kleur.accent },
  titel: { fontSize: 34, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginTop: 10 },
  sub: { fontSize: 12, color: kleur.grijs, marginTop: 4 },
  bedrag: { fontSize: 44, lineHeight: 1.2, fontFamily: "Helvetica-Bold", marginTop: 16 },
  voorVan: { fontSize: 13, color: kleur.grijs, marginTop: 6 },
  codeLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: kleur.grijs, marginTop: 18 },
  code: {
    fontSize: 22,
    lineHeight: 1.2,
    fontFamily: "Courier-Bold",
    letterSpacing: 2,
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 18,
    backgroundColor: "#ffffff",
    borderRadius: 8,
  },
  geldig: { fontSize: 10, color: kleur.grijs, marginTop: 12 },
  boodschap: { marginTop: 18, maxWidth: 520, alignItems: "center" },
  boodschapLabel: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: kleur.accent, marginBottom: 6 },
  boodschapTekst: { fontFamily: "Helvetica-Oblique", fontSize: 11, lineHeight: 1.4, textAlign: "center" },
  uitleg: { marginTop: 20, fontSize: 10, color: kleur.grijs, textAlign: "center" },
});

/** De cadeaubon als PDF (A4 liggend), om te printen of door te sturen. */
function CadeaubonPdf({ b, bestelUrl }: { b: BonGegevens; bestelUrl: string }) {
  const voorVan = [b.ontvangerNaam ? `Voor ${b.ontvangerNaam}` : "", b.koperNaam ? `van ${b.koperNaam}` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <Document title={`Cadeaubon ${b.code}`} author="Lida Thiry Imago & Kledingadvies">
      <Page size="A4" orientation="landscape" style={s.page}>
        <View style={s.kader} wrap={false}>
          <Text style={s.merk}>Lida Thiry Imago &amp; Kledingadvies</Text>
          <Text style={s.titel}>Cadeaubon</Text>
          <Text style={s.sub}>voor de online persoonlijke kledingadviestest</Text>
          <Text style={s.bedrag}>{formatteerBedrag(b.bedragCent, b.valuta)}</Text>
          {voorVan ? <Text style={s.voorVan}>{voorVan}</Text> : null}
          <Text style={s.codeLabel}>Code</Text>
          <Text style={s.code}>{b.code}</Text>
          <Text style={s.geldig}>Geldig tot en met {datumLang(b.geldigTot)} · eenmalig te gebruiken</Text>
          {b.boodschap?.trim() ? (
            <View style={s.boodschap}>
              <Text style={s.boodschapLabel}>Persoonlijke boodschap</Text>
              <Text style={s.boodschapTekst}>“{b.boodschap.trim()}”</Text>
            </View>
          ) : null}
          <Text style={s.uitleg}>
            Zo gebruik je de bon: ga naar {bestelUrl.replace(/^https?:\/\//, "")} en vul de code in bij
            ‘Kortingscode of cadeaubon’.
          </Text>
        </View>
      </Page>
    </Document>
  );
}

/** Rendert de cadeaubon naar PDF-bytes. */
export async function maakCadeaubonPdf(b: BonGegevens, bestelUrl: string): Promise<Buffer> {
  return renderToBuffer(<CadeaubonPdf b={b} bestelUrl={bestelUrl} />);
}
