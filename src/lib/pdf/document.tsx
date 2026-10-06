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
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";
import { EYEBROW, KLEUR, Kleurstrook, MERK_STANDAARD, SANS, SERIF, STROOK, Woordmerk, type Merk } from "./huisstijl";

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

interface PdfBeeld {
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
  /** Woordmerk bovenaan de voorpagina (standaard: zoals op de website). */
  merk?: Merk;
}

// Huisstijl (docs/ontwerp/HUISSTIJL-HANDBOEK.md): DM Serif Display voor koppen,
// Manrope voor tekst, donker aubergine, berry als accent en de kleurstrook.
const kleur = {
  tekst: KLEUR.ink,
  grijs: KLEUR.inkZacht,
  lijn: KLEUR.lijn,
  accent: KLEUR.berry,
  accentZacht: KLEUR.coralZacht,
  achtergrond: KLEUR.cream,
  papier: KLEUR.paper,
};

/** Marge links/rechts: 483pt tekstbreedte, precies vier beeldtegels (4 × 120) naast elkaar. */
const MARGE = 56;

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 84,
    paddingHorizontal: MARGE,
    fontSize: 10,
    color: kleur.tekst,
    fontFamily: SANS,
    lineHeight: 1.65,
    backgroundColor: kleur.papier,
  },
  cover: { backgroundColor: kleur.achtergrond, paddingTop: 58 },
  strookBoven: { position: "absolute", top: 0, left: 0, right: 0 },
  coverTitel: { fontFamily: SERIF, fontSize: 40, marginTop: 44, lineHeight: 1.08, color: kleur.tekst },
  coverAccent: { fontFamily: SERIF, fontStyle: "italic", color: KLEUR.coralTekst },
  coverVoor: { fontSize: 11, marginTop: 14, color: kleur.grijs },
  kicker: EYEBROW,
  coverRij: { flexDirection: "row", marginTop: 30, alignItems: "center" },
  coverTekst: { flex: 1, paddingRight: 32 },
  coverType: { fontFamily: SERIF, fontSize: 26, marginTop: 8, lineHeight: 1.12 },
  coverSilhouet: { fontSize: 10.5, marginTop: 16, fontWeight: 700 },
  coverUitleg: { fontSize: 9.5, marginTop: 4, color: kleur.grijs, lineHeight: 1.65 },
  figuurPaneel: {
    width: 176,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: "center",
    backgroundColor: kleur.papier,
    borderWidth: 1,
    borderColor: kleur.lijn,
    borderRadius: 20,
  },
  figuurOnderschrift: { fontSize: 7.5, color: kleur.grijs, marginTop: 10, textAlign: "center", paddingHorizontal: 12, lineHeight: 1.4 },
  matenBlok: { marginTop: 26, borderTopWidth: 1, borderTopColor: kleur.lijn, paddingTop: 16 },
  matenKolommen: { flexDirection: "row", marginTop: 8 },
  matenKolom: { flex: 1 },
  matenRij: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    borderBottomWidth: 0.75,
    borderBottomColor: kleur.lijn,
  },
  matenLabel: { color: kleur.grijs, fontSize: 9.5 },
  matenWaarde: { fontSize: 9.5, fontWeight: 600 },
  inhoud: { backgroundColor: kleur.achtergrond, borderRadius: 20, paddingVertical: 22, paddingHorizontal: 24, marginBottom: 16 },
  inhoudTitel: { fontFamily: SERIF, fontSize: 22, marginTop: 4, marginBottom: 10, lineHeight: 1.1 },
  inhoudRij: { flexDirection: "row", marginBottom: 3 },
  inhoudNummer: { width: 22, color: kleur.accent, fontWeight: 700 },
  sectieKop: { flexDirection: "row", alignItems: "center", marginTop: 28, marginBottom: 10 },
  sectieNummer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sectieNummerTekst: { fontSize: 8.5, fontWeight: 700, color: kleur.tekst, lineHeight: 1 },
  sectieTitel: { flex: 1, fontSize: 19, fontFamily: SERIF, color: kleur.tekst, lineHeight: 1.15 },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletTeken: { width: 14, color: kleur.accent, fontWeight: 700 },
  para: { marginBottom: 8 },
  beeldenRij: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginBottom: 6 },
  // Alle beelden zijn 2:3 (beeldbank-standaard): vaste tegels, 4 per rij.
  beeldKader: { width: 112, marginRight: 8, marginBottom: 10 },
  beeld: { width: 112, height: 168, objectFit: "contain" },
  bijschrift: { fontSize: 7.5, color: kleur.grijs, marginTop: 3, lineHeight: 1.35 },
  voettekst: {
    position: "absolute",
    // A4 is 841,89pt hoog; 'bottom' wordt bij doorlopende pagina's verkeerd berekend.
    top: 792,
    left: MARGE,
    right: MARGE,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 7.5,
    color: kleur.grijs,
    borderTopWidth: 0.75,
    borderTopColor: kleur.lijn,
    paddingTop: 10,
  },
  paginanummer: { fontWeight: 700, color: kleur.tekst },
});

// Ruwe markdown-achtige opmaak opschonen naar leesbare tekst.
/** Regel met vet/cursief als geneste react-pdf Text-delen. */
function Opgemaakt({ tekst }: { tekst: string }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.vet || d.cursief ? (
          // Manrope heeft geen cursief: cursief (bijv. tips) staat in de cursieve serif van de koppen.
          <Text key={i} style={d.vet ? { fontWeight: 700 } : { fontFamily: SERIF, fontStyle: "italic", fontSize: 10.5 }}>
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
        strokeOpacity={0.4}
        strokeWidth={1.5}
      />
      <Circle
        cx={HOOFD.cx}
        cy={HOOFD.cy}
        r={HOOFD.r}
        fill={kleur.tekst}
        fillOpacity={0.1}
        stroke={kleur.tekst}
        strokeOpacity={0.4}
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

/** Kleurstrook boven en voettekst onder elke pagina. */
function Rand({ sleutel, bedrijfsnaam }: { sleutel: string; bedrijfsnaam: string }) {
  return (
    <>
      <Kleurstrook hoogte={6} style={styles.strookBoven} fixed />
      <View style={styles.voettekst} fixed>
        <Text>© {bedrijfsnaam} · Type {sleutel}</Text>
        <Text style={styles.paginanummer} render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </View>
    </>
  );
}

/** Het nummer voor een sectiekop: een rondje in een kleur uit de strook. */
function SectieNummer({ nummer }: { nummer: number }) {
  return (
    <View style={[styles.sectieNummer, { backgroundColor: STROOK[(nummer - 1) % STROOK.length] }]}>
      <Text style={styles.sectieNummerTekst}>{nummer}</Text>
    </View>
  );
}

export function AdviesPdf({
  klantnaam,
  datum,
  sleutel,
  titel,
  maten,
  secties,
  silhouet,
  merk = MERK_STANDAARD,
}: AdviesPdfProps) {
  const bedrijfsnaam = merk.bedrijfsnaam?.trim() || BEDRIJFSNAAM_STANDAARD;
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
    <Document title={`Kledingadvies ${sleutel}`} author={bedrijfsnaam}>
      {/* Voorpagina */}
      <Page size="A4" style={[styles.page, styles.cover]}>
        <Rand sleutel={sleutel} bedrijfsnaam={bedrijfsnaam} />
        <Woordmerk merk={merk} grootte={15} />

        <Text style={styles.coverTitel}>
          Jouw persoonlijke <Text style={styles.coverAccent}>kledingadvies</Text>
        </Text>
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
              <Figuur vorm={silhouet.vorm} hoogte={244} />
              <Text style={styles.figuurOnderschrift}>
                {silhouet.eigenMaten
                  ? "Jouw silhouet, getekend naar je eigen maten"
                  : `Silhouet ${silhouet.naam}`}
              </Text>
            </View>
          )}
        </View>

        {toonMaten && (
          <View style={styles.matenBlok} wrap={false}>
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
        <Rand sleutel={sleutel} bedrijfsnaam={bedrijfsnaam} />
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
              <SectieNummer nummer={i + 1} />
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
