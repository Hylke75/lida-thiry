import "server-only";
import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { btwSplitsing, formatteerBedrag } from "@/lib/prijs";
import { leesMerk } from "@/lib/merk";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn, type SectieWaarden } from "@/lib/inhoud/schema";
import { BESTELLEN_FACTUUR } from "@/lib/inhoud/groepen/bestellen";

/** De beheerbare teksten op de factuur (Beheer → Teksten → Bestellen → Factuur). */
export type FactuurTeksten = SectieWaarden<typeof BESTELLEN_FACTUUR>;
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
  /**
   * Creditnota (negatieve factuur): eigen titel, verwijzing naar de oorspronkelijke
   * factuur en negatieve bedragen. Bedragen blijven positief meegegeven.
   */
  creditnota?: { origineelNummer: string | null };
  /** Tekst in het vak onderaan (standaard: voldaan via Mollie). */
  voldaanTekst?: string;
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

function FactuurPdf({ f, merk, t }: { f: FactuurGegevens; merk: Merk; t: FactuurTeksten }) {
  const teken = f.creditnota ? -1 : 1;
  const b = (cent: number) => formatteerBedrag(teken * cent, f.valuta);
  const soortNaam = f.creditnota ? "Creditnota" : t.titel;
  const split = btwSplitsing(f.totaalCent, f.btwProcent);
  const verkoperRegels = [
    ...(f.verkoper.adres ? f.verkoper.adres.split(/\r?\n/).filter(Boolean) : []),
    f.verkoper.email,
    f.verkoper.kvk ? `KvK ${f.verkoper.kvk}` : null,
    f.verkoper.btw ? `Btw ${f.verkoper.btw}` : null,
  ].filter((r): r is string => Boolean(r));

  return (
    <Document title={`${soortNaam} ${f.factuurnummer}`} author={f.verkoper.naam}>
      <Page size="A4" style={s.page}>
        <Kleurstrook hoogte={6} style={s.strookBoven} fixed />
        <View style={s.kop}>
          <View>
            <Woordmerk merk={merk} grootte={13} />
            <Text style={s.titel}>{soortNaam}</Text>
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
            <Text style={s.label}>{t.aanLabel}</Text>
            <Text>{f.koper.naam}</Text>
            {f.koper.adresregels.map((r) => (
              <Text key={r}>{r}</Text>
            ))}
            <Text>{f.koper.email}</Text>
          </View>
          <View>
            <View style={s.metaRij}>
              <Text style={s.metaLabel}>{f.creditnota ? "Creditnotanummer" : t.nummerLabel}</Text>
              <Text>{f.factuurnummer}</Text>
            </View>
            {f.creditnota?.origineelNummer && (
              <View style={s.metaRij}>
                <Text style={s.metaLabel}>Betreft factuur</Text>
                <Text>{f.creditnota.origineelNummer}</Text>
              </View>
            )}
            <View style={s.metaRij}>
              <Text style={s.metaLabel}>{f.creditnota ? "Datum" : t.datumLabel}</Text>
              <Text>{f.factuurdatum}</Text>
            </View>
          </View>
        </View>

        <View style={s.tabelKop}>
          <Text style={s.omschrijving}>{t.omschrijvingKop}</Text>
          <Text style={s.bedrag}>{t.bedragKop}</Text>
        </View>
        <View style={s.rij}>
          <Text style={s.omschrijving}>{f.omschrijving}</Text>
          <Text style={s.bedrag}>{b(f.prijsCent)}</Text>
        </View>
        {f.kortingCent > 0 && (
          <View style={s.rij}>
            <Text style={s.omschrijving}>
              {f.kortingscode ? vulIn(t.kortingMetCode, { code: f.kortingscode }) : t.korting}
            </Text>
            <Text style={s.bedrag}>- {b(f.kortingCent)}</Text>
          </View>
        )}

        <View style={s.totalen}>
          <View style={s.totaalRij}>
            <Text style={s.totaalLabel}>{t.subtotaal}</Text>
            <Text style={s.bedrag}>{b(split.exclCent)}</Text>
          </View>
          <View style={s.totaalRij}>
            <Text style={s.totaalLabel}>{vulIn(t.btw, { procent: f.btwProcent })}</Text>
            <Text style={s.bedrag}>{b(split.btwCent)}</Text>
          </View>
          <View style={[s.totaalRij, s.eindRij]}>
            <Text style={[s.totaalLabel, s.eindtotaal]}>{t.totaal}</Text>
            <Text style={[s.bedrag, s.eindtotaal]}>{b(split.inclCent)}</Text>
          </View>
        </View>

        <View style={s.betaald}>
          <Text>{f.voldaanTekst ?? vulIn(t.voldaan, { datum: f.betaaldOp })}</Text>
        </View>

        <Text style={s.voettekst} fixed>
          {[f.verkoper.naam, f.verkoper.kvk && `KvK ${f.verkoper.kvk}`, f.verkoper.btw && `Btw ${f.verkoper.btw}`, t.voettekst.trim()]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </Page>
    </Document>
  );
}

/**
 * Rendert de factuur naar PDF-bytes. Woordmerk en teksten zoals op de site
 * (Beheer → Teksten → Bestellen → Factuur), tenzij meegegeven.
 */
export async function maakFactuurPdf(f: FactuurGegevens, merk?: Merk, teksten?: FactuurTeksten): Promise<Buffer> {
  const [m, t] = await Promise.all([merk ?? leesMerk(), teksten ?? leesSectie(BESTELLEN_FACTUUR)]);
  return renderToBuffer(<FactuurPdf f={f} merk={m} t={t} />);
}
