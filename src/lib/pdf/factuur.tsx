import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { btwSplitsing, formatteerBedrag } from "@/lib/prijs";
import { leesMerk } from "@/lib/merk";
import { EYEBROW, KLEUR, Kleurstrook, SANS, SERIF, Woordmerk, type Merk } from "./huisstijl";

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

const kleur = { tekst: KLEUR.ink, grijs: KLEUR.inkZacht, lijn: KLEUR.lijn, accent: KLEUR.berry };

const s = StyleSheet.create({
  page: {
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 60,
    fontSize: 9.5,
    color: kleur.tekst,
    fontFamily: SANS,
    lineHeight: 1.6,
    backgroundColor: KLEUR.paper,
  },
  strookBoven: { position: "absolute", top: 0, left: 0, right: 0 },
  kop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 40 },
  titel: { fontFamily: SERIF, fontSize: 34, lineHeight: 1.05, marginTop: 28 },
  verkoper: { textAlign: "right", fontSize: 8.5, color: kleur.grijs },
  verkoperNaam: { fontWeight: 700, color: kleur.tekst },
  blokken: { flexDirection: "row", justifyContent: "space-between", marginBottom: 32 },
  label: { ...EYEBROW, marginBottom: 5 },
  metaRij: { flexDirection: "row", justifyContent: "flex-end" },
  metaLabel: { width: 90, color: kleur.grijs, textAlign: "right", marginRight: 10 },
  tabelKop: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: kleur.tekst,
    paddingBottom: 6,
    marginBottom: 6,
    fontWeight: 700,
    fontSize: 8,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  rij: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: kleur.lijn },
  omschrijving: { flex: 1 },
  bedrag: { width: 110, textAlign: "right" },
  totalen: { marginTop: 14, paddingTop: 4 },
  totaalRij: { flexDirection: "row", justifyContent: "flex-end", paddingVertical: 2 },
  totaalLabel: { width: 180, textAlign: "right", marginRight: 10, color: kleur.grijs },
  eindtotaal: { fontWeight: 700, color: kleur.tekst, fontSize: 11 },
  eindRij: { marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: kleur.lijn },
  betaald: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: KLEUR.cream,
    borderLeftWidth: 4,
    borderLeftColor: KLEUR.sage,
    borderRadius: 4,
  },
  voettekst: {
    position: "absolute",
    top: 792,
    left: 60,
    right: 60,
    textAlign: "center",
    fontSize: 7.5,
    color: kleur.grijs,
    borderTopWidth: 0.75,
    borderTopColor: kleur.lijn,
    paddingTop: 10,
  },
});

function FactuurPdf({ f, merk }: { f: FactuurGegevens; merk: Merk }) {
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
        <Kleurstrook hoogte={6} style={s.strookBoven} fixed />
        <View style={s.kop}>
          <View>
            <Woordmerk merk={merk} grootte={13} />
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
          <View style={[s.totaalRij, s.eindRij]}>
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

/** Rendert de factuur naar PDF-bytes (het woordmerk zoals op de site, tenzij meegegeven). */
export async function maakFactuurPdf(f: FactuurGegevens, merk?: Merk): Promise<Buffer> {
  return renderToBuffer(<FactuurPdf f={f} merk={merk ?? (await leesMerk())} />);
}
