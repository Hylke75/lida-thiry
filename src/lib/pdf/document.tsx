import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export interface PdfMaten {
  lengte_cm: number | null;
  gewicht_kg: number | null;
  borst: number | null;
  taille: number | null;
  hoge_heup: number | null;
  heup: number | null;
  binnenbeen: number | null;
  schouder: number | null;
}

export interface PdfSectie {
  kop: string;
  tekst: string;
  /** Data-URI's van bijbehorende afbeeldingen. */
  beelden?: string[];
}

export interface AdviesPdfProps {
  klantnaam: string;
  datum: string;
  sleutel: string;
  titel: string;
  maten: PdfMaten;
  secties: PdfSectie[];
}

const kleur = { tekst: "#1a1a1a", grijs: "#6b6b6b", lijn: "#e0ddd6", accent: "#8a7a66" };

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontSize: 10.5, color: kleur.tekst, fontFamily: "Helvetica", lineHeight: 1.5 },
  merk: { fontSize: 9, letterSpacing: 2, textTransform: "uppercase", color: kleur.accent },
  coverTitel: { fontSize: 26, marginTop: 140, fontFamily: "Helvetica-Bold" },
  coverType: { fontSize: 14, marginTop: 10, color: kleur.grijs },
  coverNaam: { fontSize: 12, marginTop: 40 },
  coverDatum: { fontSize: 10, color: kleur.grijs, marginTop: 2 },
  matenBlok: { marginTop: 28, borderTopWidth: 1, borderTopColor: kleur.lijn, paddingTop: 14 },
  matenTitel: { fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", color: kleur.accent, marginBottom: 8 },
  matenRij: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  matenLabel: { color: kleur.grijs },
  sectieKop: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 18, marginBottom: 6, color: kleur.tekst },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletTeken: { width: 12 },
  para: { marginBottom: 6 },
  beeldenRij: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginBottom: 4 },
  beeld: { width: 96, marginRight: 6, marginBottom: 6 },
  voettekst: { position: "absolute", bottom: 28, left: 56, right: 56, textAlign: "center", fontSize: 8, color: kleur.grijs, borderTopWidth: 1, borderTopColor: kleur.lijn, paddingTop: 8 },
});

// Ruwe markdown-achtige opmaak opschonen naar leesbare tekst.
function schoon(tekst: string): string {
  return tekst
    .replace(/<\/?u>/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\\$/gm, "")
    .trim();
}

function blokken(tekst: string): { type: "bullet" | "para"; tekst: string }[] {
  const uit: { type: "bullet" | "para"; tekst: string }[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      uit.push({ type: "para", tekst: para.join(" ") });
      para = [];
    }
  };
  for (const rawRegel of schoon(tekst).split("\n")) {
    const regel = rawRegel.trim();
    if (!regel) {
      flush();
      continue;
    }
    if (/^[-•]\s+/.test(regel)) {
      flush();
      uit.push({ type: "bullet", tekst: regel.replace(/^[-•]\s+/, "") });
    } else {
      para.push(regel);
    }
  }
  flush();
  return uit;
}

function MatenRij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <View style={styles.matenRij}>
      <Text style={styles.matenLabel}>{label}</Text>
      <Text>{waarde}</Text>
    </View>
  );
}

export function AdviesPdf({ klantnaam, datum, sleutel, titel, maten, secties }: AdviesPdfProps) {
  const cm = (v: number | null) => (v == null ? "–" : `${v} cm`);
  return (
    <Document title={`Kledingadvies ${sleutel}`} author="Lida Thiry Imago & Kledingadvies">
      {/* Voorpagina */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.merk}>Lida Thiry · Imago &amp; Kledingadvies</Text>
        <Text style={styles.coverTitel}>Jouw persoonlijke kledingadvies</Text>
        <Text style={styles.coverType}>{titel}</Text>
        <Text style={styles.coverNaam}>Voor: {klantnaam}</Text>
        <Text style={styles.coverDatum}>{datum}</Text>

        <View style={styles.matenBlok}>
          <Text style={styles.matenTitel}>Jouw gegevens</Text>
          <MatenRij label="Lengte" waarde={cm(maten.lengte_cm)} />
          <MatenRij label="Gewicht" waarde={maten.gewicht_kg == null ? "–" : `${maten.gewicht_kg} kg`} />
          <MatenRij label="Borstomvang" waarde={cm(maten.borst)} />
          <MatenRij label="Tailleomvang" waarde={cm(maten.taille)} />
          <MatenRij label="Hoge heupomvang" waarde={cm(maten.hoge_heup)} />
          <MatenRij label="Heupomvang" waarde={cm(maten.heup)} />
          {maten.schouder != null && <MatenRij label="Schouderomvang" waarde={cm(maten.schouder)} />}
          {maten.binnenbeen != null && <MatenRij label="Binnenbeenlengte" waarde={cm(maten.binnenbeen)} />}
        </View>

        <Text style={styles.voettekst} fixed>
          © Lida Thiry Imago &amp; Kledingadvies
        </Text>
      </Page>

      {/* Advies */}
      <Page size="A4" style={styles.page}>
        {secties.map((s, i) => (
          <View key={i}>
            <Text style={styles.sectieKop}>{s.kop}</Text>
            {blokken(s.tekst).map((b, j) =>
              b.type === "bullet" ? (
                <View key={j} style={styles.bullet}>
                  <Text style={styles.bulletTeken}>•</Text>
                  <Text style={{ flex: 1 }}>{b.tekst}</Text>
                </View>
              ) : (
                <Text key={j} style={styles.para}>
                  {b.tekst}
                </Text>
              ),
            )}
            {s.beelden && s.beelden.length > 0 && (
              <View style={styles.beeldenRij}>
                {s.beelden.map((src, k) => (
                  // react-pdf Image (geen HTML img); alt bestaat hier niet.
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image key={k} src={src} style={styles.beeld} />
                ))}
              </View>
            )}
          </View>
        ))}
        <Text style={styles.voettekst} fixed>
          © Lida Thiry Imago &amp; Kledingadvies
        </Text>
      </Page>
    </Document>
  );
}
