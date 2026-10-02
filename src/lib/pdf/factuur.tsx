import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { btwSplitsing, formatteerBedrag } from "@/lib/prijs";

export interface FactuurGegevens {
  factuurnummer: string;
  /** Leesbare datums, bijv. "2 oktober 2026". */
  factuurdatum: string;
  betaaldOp: string;
  verkoper: {
    naam: string;
    adres: string | null;
    kvk: string | null;
    btw: string | null;
    email: string | null;
  };
  koper: {
    naam: string;
    email: string;
    adresregels: string[];
  };
  omschrijving: string;
  /** Prijs vóór korting, incl. btw (centen). */
  prijsCent: number;
  kortingCent: number;
  kortingscode: string | null;
  /** Betaald bedrag incl. btw (centen). */
  totaalCent: number;
  valuta: string;
  btwProcent: number;
}

const kleur = { tekst: "#2b2a28", grijs: "#6b6b6b", lijn: "#e0ddd6", accent: "#a4634d" };

const s = StyleSheet.create({
  page: { padding: 56, fontSize: 10, color: kleur.tekst, fontFamily: "Helvetica", lineHeight: 1.5 },
  kop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 36 },
  merk: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: kleur.accent },
  titel: { fontSize: 22, fontFamily: "Helvetica-Bold", marginTop: 6 },
  verkoper: { textAlign: "right", fontSize: 9, color: kleur.grijs },
  verkoperNaam: { fontFamily: "Helvetica-Bold", color: kleur.tekst },
  blokken: { flexDirection: "row", justifyContent: "space-between", marginBottom: 28 },
  label: { fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: kleur.accent, marginBottom: 4 },
  metaRij: { flexDirection: "row", justifyContent: "flex-end" },
  metaLabel: { width: 90, color: kleur.grijs, textAlign: "right", marginRight: 10 },
  tabelKop: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: kleur.lijn,
    paddingBottom: 6,
    marginBottom: 6,
    fontFamily: "Helvetica-Bold",
  },
  rij: { flexDirection: "row", paddingVertical: 4 },
  omschrijving: { flex: 1 },
  bedrag: { width: 110, textAlign: "right" },
  totalen: { marginTop: 12, borderTopWidth: 1, borderTopColor: kleur.lijn, paddingTop: 8 },
  totaalRij: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
  totaalLabel: { width: 180, textAlign: "right", marginRight: 10, color: kleur.grijs },
  eindtotaal: { fontFamily: "Helvetica-Bold", color: kleur.tekst },
  betaald: {
    marginTop: 28,
    padding: 12,
    backgroundColor: "#f3e6df",
    borderRadius: 6,
  },
  voettekst: {
    position: "absolute",
    bottom: 28,
    left: 56,
    right: 56,
    textAlign: "center",
    fontSize: 8,
    color: kleur.grijs,
    borderTopWidth: 1,
    borderTopColor: kleur.lijn,
    paddingTop: 8,
  },
});

export function FactuurPdf({ f }: { f: FactuurGegevens }) {
  const b = (cent: number) => formatteerBedrag(cent, f.valuta);
  const split = btwSplitsing(f.totaalCent, f.btwProcent);
  const verkoperRegels = [
    ...(f.verkoper.adres ? f.verkoper.adres.split(/\r?\n/).filter(Boolean) : []),
    f.verkoper.email,
    f.verkoper.kvk ? `KvK ${f.verkoper.kvk}` : null,
    f.verkoper.btw ? `Btw ${f.verkoper.btw}` : null,
  ].filter((r): r is string => Boolean(r));

  return (
    <Document title={`Factuur ${f.factuurnummer}`} author={f.verkoper.naam}>
      <Page size="A4" style={s.page}>
        <View style={s.kop}>
          <View>
            <Text style={s.merk}>{f.verkoper.naam}</Text>
            <Text style={s.titel}>Factuur</Text>
          </View>
          <View style={s.verkoper}>
            <Text style={s.verkoperNaam}>{f.verkoper.naam}</Text>
            {verkoperRegels.map((r) => (
              <Text key={r}>{r}</Text>
            ))}
          </View>
        </View>

        <View style={s.blokken}>
          <View>
            <Text style={s.label}>Factuur aan</Text>
            <Text>{f.koper.naam}</Text>
            {f.koper.adresregels.map((r) => (
              <Text key={r}>{r}</Text>
            ))}
            <Text>{f.koper.email}</Text>
          </View>
          <View>
            <View style={s.metaRij}>
              <Text style={s.metaLabel}>Factuurnummer</Text>
              <Text>{f.factuurnummer}</Text>
            </View>
            <View style={s.metaRij}>
              <Text style={s.metaLabel}>Factuurdatum</Text>
              <Text>{f.factuurdatum}</Text>
            </View>
          </View>
        </View>

        <View style={s.tabelKop}>
          <Text style={s.omschrijving}>Omschrijving</Text>
          <Text style={s.bedrag}>Bedrag (incl. btw)</Text>
        </View>
        <View style={s.rij}>
          <Text style={s.omschrijving}>{f.omschrijving}</Text>
          <Text style={s.bedrag}>{b(f.prijsCent)}</Text>
        </View>
        {f.kortingCent > 0 && (
          <View style={s.rij}>
            <Text style={s.omschrijving}>
              {f.kortingscode ? `Korting (code ${f.kortingscode})` : "Korting"}
            </Text>
            <Text style={s.bedrag}>- {b(f.kortingCent)}</Text>
          </View>
        )}

        <View style={s.totalen}>
          <View style={s.totaalRij}>
            <Text style={s.totaalLabel}>Subtotaal excl. btw</Text>
            <Text style={s.bedrag}>{b(split.exclCent)}</Text>
          </View>
          <View style={s.totaalRij}>
            <Text style={s.totaalLabel}>Btw {f.btwProcent}%</Text>
            <Text style={s.bedrag}>{b(split.btwCent)}</Text>
          </View>
          <View style={s.totaalRij}>
            <Text style={[s.totaalLabel, s.eindtotaal]}>Totaal incl. btw</Text>
            <Text style={[s.bedrag, s.eindtotaal]}>{b(split.inclCent)}</Text>
          </View>
        </View>

        <View style={s.betaald}>
          <Text>
            Voldaan: betaald via Mollie op {f.betaaldOp}. Je hoeft niets meer te betalen.
          </Text>
        </View>

        <Text style={s.voettekst} fixed>
          {[f.verkoper.naam, f.verkoper.kvk && `KvK ${f.verkoper.kvk}`, f.verkoper.btw && `Btw ${f.verkoper.btw}`]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}

/** Rendert de factuur naar PDF-bytes. */
export async function maakFactuurPdf(f: FactuurGegevens): Promise<Buffer> {
  return renderToBuffer(<FactuurPdf f={f} />);
}
