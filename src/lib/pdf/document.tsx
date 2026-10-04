import { blokken, inlineDelen, zonderOpmaak } from "./opmaak";
import {
  Document,
  Page,
  View,
  Text,
  Image,
  Svg,
  Path,
  Circle,
  Line,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Lichaamsvorm } from "@/lib/test-config";
import { CX, HOOFD, VIEWBOX, Y, lichaamsPad } from "@/lib/lichaam-pad";

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

export interface PdfBeeld {
  /** Data-URI van het beeld. */
  src: string;
  bijschrift?: string | null;
}

export interface PdfSectie {
  kop: string;
  tekst: string;
  beelden?: PdfBeeld[];
}

export interface PdfSilhouet {
  naam: string;
  uitleg: string;
  /** Vorm voor de illustratie: bij voorkeur uit de eigen maten van de klant. */
  vorm: Lichaamsvorm;
  /** True als de vorm uit de eigen maten is getekend (anders het standaardsilhouet). */
  eigenMaten: boolean;
}

export interface AdviesPdfProps {
  klantnaam: string;
  datum: string;
  sleutel: string;
  titel: string;
  maten: PdfMaten;
  secties: PdfSectie[];
  silhouet?: PdfSilhouet | null;
}

// Huisstijl (gelijk aan de website): roségoud accent, antraciet, warm off-white.
const kleur = {
  tekst: "#2b2a28",
  grijs: "#7a736c",
  lijn: "#e6dcd3",
  accent: "#a4634d",
  accentZacht: "#f3e6df",
  achtergrond: "#faf8f5",
};

const SERIF = "Times-Roman";
const SERIF_VET = "Times-Bold";

const styles = StyleSheet.create({
  page: {
    paddingTop: 56,
    paddingBottom: 72,
    paddingHorizontal: 56,
    fontSize: 10.5,
    color: kleur.tekst,
    fontFamily: "Helvetica",
    lineHeight: 1.5,
  },
  cover: { backgroundColor: kleur.achtergrond },
  merk: { fontSize: 8.5, letterSpacing: 2, textTransform: "uppercase", color: kleur.accent },
  merkLijn: { marginTop: 10, width: 36, borderTopWidth: 1, borderTopColor: kleur.accent },
  coverTitel: { fontFamily: SERIF, fontSize: 30, marginTop: 36, lineHeight: 1.15 },
  coverVoor: { fontSize: 11, marginTop: 10, color: kleur.grijs },
  kicker: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: kleur.accent },
  coverRij: { flexDirection: "row", marginTop: 32, alignItems: "center" },
  coverTekst: { flex: 1, paddingRight: 28 },
  coverType: { fontFamily: SERIF, fontSize: 20, marginTop: 6, lineHeight: 1.2 },
  coverSilhouet: { fontSize: 10.5, marginTop: 14, fontFamily: "Helvetica-Bold" },
  coverUitleg: { fontSize: 9.5, marginTop: 4, color: kleur.grijs, lineHeight: 1.55 },
  figuurPaneel: {
    width: 168,
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: kleur.accentZacht,
    borderRadius: 8,
  },
  figuurOnderschrift: { fontSize: 7.5, color: kleur.grijs, marginTop: 8, textAlign: "center", paddingHorizontal: 10 },
  matenBlok: { marginTop: 28, borderTopWidth: 1, borderTopColor: kleur.lijn, paddingTop: 14 },
  matenKolommen: { flexDirection: "row", marginTop: 8 },
  matenKolom: { flex: 1 },
  matenRij: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: kleur.lijn,
  },
  matenLabel: { color: kleur.grijs, fontSize: 9.5 },
  matenWaarde: { fontSize: 9.5 },
  inhoud: { backgroundColor: kleur.accentZacht, borderRadius: 8, padding: 18, marginBottom: 10 },
  inhoudTitel: { fontFamily: SERIF, fontSize: 16, marginTop: 4, marginBottom: 8 },
  inhoudRij: { flexDirection: "row", marginBottom: 2 },
  inhoudNummer: { width: 20, color: kleur.accent },
  sectieKop: { flexDirection: "row", alignItems: "baseline", marginTop: 20, marginBottom: 6 },
  sectieNummer: { fontSize: 10, color: kleur.accent, width: 22 },
  sectieTitel: { flex: 1, fontSize: 15, fontFamily: SERIF_VET, color: kleur.tekst, lineHeight: 1.25 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  bulletTeken: { width: 12, color: kleur.accent },
  para: { marginBottom: 6 },
  beeldenRij: { flexDirection: "row", flexWrap: "wrap", marginTop: 6, marginBottom: 4 },
  // Alle beelden zijn 2:3 (beeldbank-standaard): vaste tegels, 4 per rij.
  beeldKader: { width: 112, marginRight: 8, marginBottom: 8 },
  beeld: { width: 112, height: 168, objectFit: "contain" },
  bijschrift: { fontSize: 7.5, color: "#6b6b6b", marginTop: 2, lineHeight: 1.3 },
  voettekst: {
    position: "absolute",
    // A4 is 841,89pt hoog; 'bottom' wordt bij doorlopende pagina's verkeerd berekend.
    top: 790,
    left: 56,
    right: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7.5,
    color: kleur.grijs,
    borderTopWidth: 0.5,
    borderTopColor: kleur.lijn,
    paddingTop: 8,
  },
});

// Ruwe markdown-achtige opmaak opschonen naar leesbare tekst.
/** Regel met vet/cursief als geneste react-pdf Text-delen. */
function Opgemaakt({ tekst }: { tekst: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.vet || d.cursief ? (
          <Text key={i} style={{ fontFamily: d.vet ? "Helvetica-Bold" : "Helvetica-Oblique" }}>
            {d.tekst}
          </Text>
        ) : (
          d.tekst
        ),
      )}
    </>
  );
}

/** Het silhouet als vectortekening; dezelfde geometrie als op de website. */
function Figuur({ vorm, hoogte }: { vorm: Lichaamsvorm; hoogte: number }) {
  const breedte = (hoogte * VIEWBOX.breedte) / VIEWBOX.hoogte;
  const lijn = (y: number, half: number) => (
    <Line
      x1={CX - half - 8}
      y1={y}
      x2={CX + half + 8}
      y2={y}
      stroke={kleur.accent}
      strokeWidth={1.2}
      strokeDasharray="3 3"
    />
  );
  return (
    <Svg viewBox={`0 0 ${VIEWBOX.breedte} ${VIEWBOX.hoogte}`} width={breedte} height={hoogte}>
      <Path
        d={lichaamsPad(vorm)}
        fill={kleur.tekst}
        fillOpacity={0.1}
        stroke={kleur.tekst}
        strokeOpacity={0.45}
        strokeWidth={1.5}
      />
      <Circle
        cx={HOOFD.cx}
        cy={HOOFD.cy}
        r={HOOFD.r}
        fill={kleur.tekst}
        fillOpacity={0.1}
        stroke={kleur.tekst}
        strokeOpacity={0.45}
        strokeWidth={1.5}
      />
      {lijn(Y.borst, vorm.borst)}
      {lijn(Y.taille, vorm.taille)}
      {lijn(Y.heup, vorm.heup)}
    </Svg>
  );
}

function MatenRij({ label, waarde }: { label: string; waarde: string }) {
  return (
    <View style={styles.matenRij}>
      <Text style={styles.matenLabel}>{label}</Text>
      <Text style={styles.matenWaarde}>{waarde}</Text>
    </View>
  );
}

function Voettekst({ sleutel }: { sleutel: string }) {
  return (
    <View style={styles.voettekst} fixed>
      <Text>© Lida Thiry Imago &amp; Kledingadvies · Type {sleutel}</Text>
      <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
    </View>
  );
}

export function AdviesPdf({ klantnaam, datum, sleutel, titel, maten, secties, silhouet }: AdviesPdfProps) {
  const cm = (v: number | null) => (v == null ? "–" : `${v} cm`);
  const matenRijen: { label: string; waarde: string }[] = [
    { label: "Lengte", waarde: cm(maten.lengte_cm) },
    { label: "Gewicht", waarde: maten.gewicht_kg == null ? "–" : `${maten.gewicht_kg} kg` },
    ...(maten.schouder != null ? [{ label: "Schouderomvang", waarde: cm(maten.schouder) }] : []),
    { label: "Borstomvang", waarde: cm(maten.borst) },
    { label: "Tailleomvang", waarde: cm(maten.taille) },
    { label: "Hoge heupomvang", waarde: cm(maten.hoge_heup) },
    { label: "Heupomvang", waarde: cm(maten.heup) },
    ...(maten.binnenbeen != null ? [{ label: "Binnenbeenlengte", waarde: cm(maten.binnenbeen) }] : []),
  ];
  const helft = Math.ceil(matenRijen.length / 2);
  const toonMaten = matenRijen.some((r) => r.waarde !== "–");

  return (
    <Document title={`Kledingadvies ${sleutel}`} author="Lida Thiry Imago & Kledingadvies">
      {/* Voorpagina */}
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Voettekst sleutel={sleutel} />
        <Text style={styles.merk}>Lida Thiry · Imago &amp; Kledingadvies</Text>
        <View style={styles.merkLijn} />

        <Text style={styles.coverTitel}>Jouw persoonlijke kledingadvies</Text>
        <Text style={styles.coverVoor}>
          Voor {klantnaam} · {datum}
        </Text>

        <View style={styles.coverRij}>
          <View style={styles.coverTekst}>
            <Text style={styles.kicker}>Jouw type</Text>
            <Text style={styles.coverType}>{titel}</Text>
            {silhouet && (
              <>
                <Text style={styles.coverSilhouet}>Silhouet: {silhouet.naam}</Text>
                <Text style={styles.coverUitleg}>{silhouet.uitleg}</Text>
              </>
            )}
          </View>
          {silhouet && (
            <View style={styles.figuurPaneel}>
              <Figuur vorm={silhouet.vorm} hoogte={270} />
              <Text style={styles.figuurOnderschrift}>
                {silhouet.eigenMaten
                  ? "Jouw silhouet, getekend naar je eigen maten"
                  : `Silhouet ${silhouet.naam}`}
              </Text>
            </View>
          )}
        </View>

        {toonMaten && (
          <View style={styles.matenBlok}>
            <Text style={styles.kicker}>Jouw maten</Text>
            <View style={styles.matenKolommen}>
              <View style={[styles.matenKolom, { marginRight: 14 }]}>
                {matenRijen.slice(0, helft).map((r) => (
                  <MatenRij key={r.label} label={r.label} waarde={r.waarde} />
                ))}
              </View>
              <View style={[styles.matenKolom, { marginLeft: 14 }]}>
                {matenRijen.slice(helft).map((r) => (
                  <MatenRij key={r.label} label={r.label} waarde={r.waarde} />
                ))}
              </View>
            </View>
          </View>
        )}

      </Page>

      {/* Advies */}
      <Page size="A4" style={styles.page}>
        <Voettekst sleutel={sleutel} />
        {secties.length > 1 && (
          <View style={styles.inhoud}>
            <Text style={styles.kicker}>In dit advies</Text>
            <Text style={styles.inhoudTitel}>Inhoud</Text>
            {secties.map((s, i) => (
              <View key={i} style={styles.inhoudRij}>
                <Text style={styles.inhoudNummer}>{i + 1}.</Text>
                <Text style={{ flex: 1 }}>{zonderOpmaak(s.kop)}</Text>
              </View>
            ))}
          </View>
        )}

        {secties.map((s, i) => (
          <View key={i}>
            <View style={styles.sectieKop} minPresenceAhead={60} wrap={false}>
              <Text style={styles.sectieNummer}>{i + 1}.</Text>
              <Text style={styles.sectieTitel}>{zonderOpmaak(s.kop)}</Text>
            </View>
            {blokken(s.tekst).map((b, j) =>
              b.type === "bullet" ? (
                <View key={j} style={styles.bullet} wrap={false}>
                  <Text style={styles.bulletTeken}>•</Text>
                  <Text style={{ flex: 1 }}>
                    <Opgemaakt tekst={b.tekst} />
                  </Text>
                </View>
              ) : (
                <Text key={j} style={styles.para}>
                  <Opgemaakt tekst={b.tekst} />
                </Text>
              ),
            )}
            {s.beelden && s.beelden.length > 0 && (
              <View style={styles.beeldenRij}>
                {s.beelden.map((b, k) => (
                  <View key={k} style={styles.beeldKader} wrap={false}>
                    {/* react-pdf Image (geen HTML img); alt bestaat hier niet. */}
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image src={b.src} style={styles.beeld} />
                    {b.bijschrift ? <Text style={styles.bijschrift}>{b.bijschrift}</Text> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </Page>
    </Document>
  );
}
