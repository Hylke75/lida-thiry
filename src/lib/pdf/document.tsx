import path from "node:path";
import { blokken, inlineDelen, zonderOpmaak, type Blok } from "./opmaak";
import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";
import { ARIAL, MERK_STANDAARD, SANS, type Merk } from "./huisstijl";
import { standaardWaarden, vulIn } from "@/lib/inhoud/schema";
import {
  PDF_ADVIES_INTRO,
  PDF_ADVIES_SLOT,
  PDF_ADVIES_VOORPAGINA,
  type AdviesPdfTeksten,
} from "@/lib/inhoud/groepen/pdf-advies";

interface PdfBeeld {
  /** Data-URI van het beeld. */
  src: string;
  bijschrift?: string | null;
}

export interface PdfSectie {
  kop: string;
  tekst: string;
  /** Vast onderdeel uit het adviesdocument (bijv. "silhouet"); bepaalt kleine verschillen in de opmaak. */
  soort?: string | null;
  beelden?: PdfBeeld[];
}

export interface AdviesPdfProps {
  klantnaam: string;
  /** Datum van het advies, bijv. "7 oktober 2026"; bovenaan de pagina's staan maand en jaar. */
  datum: string;
  sleutel: string;
  titel: string;
  secties: PdfSectie[];
  /** Het silhouet (onder de silhouettekening), bijv. letter "A" en naam "Peer / driehoek". */
  silhouet?: { letter: string; naam: string } | null;
  /** Bedrijfsnaam bovenaan de pagina's (standaard: zoals op de website). */
  merk?: Merk;
  /** Beheerbare teksten (Beheer → Teksten → PDF-advies); standaard de standaardteksten. */
  teksten?: AdviesPdfTeksten;
}

/** De standaardteksten van de advies-PDF (zonder database, bijv. in tests). */
export function standaardAdviesPdfTeksten(): AdviesPdfTeksten {
  return {
    voorpagina: standaardWaarden(PDF_ADVIES_VOORPAGINA),
    intro: standaardWaarden(PDF_ADVIES_INTRO),
    slot: standaardWaarden(PDF_ADVIES_SLOT),
  };
}

// Vormgeving naar Lida's eigen online stijladvies (Pages-document): een voorpagina
// met de groene baan, het logo en de roze krullen; daarna Arial op wit, met de
// beelden in een smalle kolom links naast de tekst en tips in roze cursief.
const kleur = {
  tekst: "#000000",
  grijs: "#7A7A7A",
  lime: "#B3DB18",
  olijf: "#94AD1B",
  magenta: "#CE026E",
  tip: "#FF4F79",
};

/** De voorpagina zonder titel (baan, logo en krullen), zoals in het origineel. */
const VOORPAGINA = path.join(process.cwd(), "src", "lib", "pdf", "beelden", "advies-voorpagina.png");

const A4 = { breedte: 595.28, hoogte: 841.89 };
const LINKS = 72;
const RECHTS = 48;
/** Kolom met beelden links; de tekst staat ernaast. */
const BEELDKOLOM = 124;
const TUSSENRUIMTE = 17;
const TEKSTKOLOM = A4.breedte - LINKS - RECHTS - BEELDKOLOM - TUSSENRUIMTE;
/** Beelden zijn 2:3 (beeldbank-standaard). */
const BEELD = { breedte: 112, hoogte: 168 };
/**
 * Beelden die niet meer naast de tekst passen: in rijen van vijf onder de tekst,
 * over de hele breedte (zoals de lijntekeningen in het origineel). De tussenruimte
 * is naar beneden afgerond, anders loopt een rij net te vroeg door naar de volgende.
 */
const BREEDTE = A4.breedte - LINKS - RECHTS;
const PER_RIJ = 5;
const TEGEL = { breedte: 88, hoogte: 132, tussen: Math.floor((BREEDTE - PER_RIJ * 88) / (PER_RIJ - 1)) - 1 };
const REGEL = 12;

const styles = StyleSheet.create({
  page: {
    paddingTop: 76,
    paddingBottom: 72,
    paddingLeft: LINKS,
    paddingRight: RECHTS,
    fontFamily: ARIAL,
    fontSize: 10,
    lineHeight: 1.2,
    color: kleur.tekst,
    backgroundColor: "#FFFFFF",
  },
  voorpagina: { padding: 0, backgroundColor: "#FFFFFF" },
  voorpaginaBeeld: { position: "absolute", top: 0, left: 0, width: A4.breedte, height: A4.hoogte - 1 },
  voorpaginaTitel: {
    position: "absolute",
    top: 283,
    left: 200,
    right: RECHTS,
    fontFamily: ARIAL,
    fontWeight: 700,
    fontStyle: "italic",
    fontSize: 16,
    color: kleur.olijf,
    textTransform: "uppercase",
  },
  // Kop- en voetregel: los geplaatst (geen rij met paginanummers; daar liep react-pdf op vast).
  kopLinks: { position: "absolute", top: 38, left: LINKS, fontFamily: SANS, fontSize: 9, color: kleur.grijs },
  kopRechts: {
    position: "absolute",
    top: 38,
    left: LINKS,
    right: RECHTS,
    textAlign: "right",
    fontFamily: SANS,
    fontSize: 9,
    color: kleur.grijs,
  },
  voet: { position: "absolute", top: 796, left: LINKS, right: RECHTS, fontFamily: SANS, fontSize: 9, color: kleur.grijs },
  aanhef: { marginLeft: BEELDKOLOM + TUSSENRUIMTE, marginBottom: 12 },
  groep: { flexDirection: "row", marginBottom: 6 },
  beeldkolom: { width: BEELDKOLOM, marginRight: TUSSENRUIMTE, alignItems: "center" },
  tekstkolom: { width: TEKSTKOLOM },
  beeldKader: { width: BEELD.breedte, marginBottom: 10, alignItems: "center" },
  beeld: { width: BEELD.breedte, height: BEELD.hoogte, objectFit: "contain" },
  silhouetLabel: { fontWeight: 700, fontSize: 11, marginTop: 6, textAlign: "center" },
  bijschrift: { fontStyle: "italic", fontSize: 8.5, marginTop: 4, textAlign: "center" },
  tip: { width: BEELDKOLOM, fontStyle: "italic", color: kleur.tip, marginTop: 6, marginBottom: 10 },
  sectie: { marginBottom: 12 },
  sectieKop: { fontWeight: 700 },
  para: { marginBottom: 6 },
  bullet: { flexDirection: "row", marginBottom: 1 },
  bulletTeken: { width: 24, paddingLeft: 10 },
  beeldRij: { flexDirection: "row", width: BREEDTE, marginTop: 4, marginBottom: 6 },
  tegel: { width: TEGEL.breedte, marginBottom: 12, alignItems: "center" },
  tegelBeeld: { width: TEGEL.breedte, height: TEGEL.hoogte, objectFit: "contain" },
  // Optionele introductie- en slotpagina (Beheer → Teksten → PDF-advies).
  losTitel: { fontWeight: 700, fontSize: 16, marginBottom: 14, lineHeight: 1.2 },
  accent: { fontStyle: "italic", color: kleur.magenta },
  losKop: { fontWeight: 700, fontSize: 11, marginTop: 10, marginBottom: 4 },
  slotBlok: { marginBottom: 14 },
  slotOproep: { borderLeftWidth: 3, borderLeftColor: kleur.lime, paddingLeft: 12, marginTop: 4, marginBottom: 14 },
  disclaimer: { fontSize: 8, color: kleur.grijs, lineHeight: 1.4, marginTop: 10 },
});

/** Een titel met één woord tussen *sterretjes* als roze cursief accent. */
function TitelMetAccent({ tekst, style }: { tekst: string; style: Style }) {
  const delen = tekst.split(/\*([^*]+)\*/);
  return (
    <Text style={style}>
      {delen.map((d, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={styles.accent}>
            {d}
          </Text>
        ) : (
          d || null
        ),
      )}
    </Text>
  );
}

/** Links uit een beheerbare tekst als leesbare tekst: "[tekst](https://x.nl)" → "tekst (x.nl)". */
function linksAlsTekst(tekst: string): string {
  return tekst.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t: string, url: string) => {
    const kaal = url.replace(/^(mailto:|tel:|https?:\/\/)/i, "").replace(/\/$/, "");
    return kaal && kaal !== t.trim() ? `${t} (${kaal})` : t;
  });
}

/**
 * Regel met opmaak als geneste Text-delen. In het advies staat **vet** onderstreept
 * (zoals "Met rechte pijp:" in Lida's adviezen); op de losse pagina's vet.
 */
function Opgemaakt({ tekst, onderstreept = false }: { tekst: string; onderstreept?: boolean }) {
  return (
    <>
      {inlineDelen(tekst).map((d, i) =>
        d.vet || d.cursief ? (
          <Text
            key={i}
            style={d.vet ? (onderstreept ? { textDecoration: "underline" } : { fontWeight: 700 }) : { fontStyle: "italic" }}
          >
            {d.tekst}
          </Text>
        ) : (
          d.tekst
        ),
      )}
    </>
  );
}

/** Tekstblokken (alinea's en opsommingen). */
function Blokken({ items, onderstreept = false, vet = false }: { items: Blok[]; onderstreept?: boolean; vet?: boolean }) {
  return (
    <>
      {items.map((b, j) =>
        b.type === "bullet" ? (
          <View key={j} style={styles.bullet} wrap={false}>
            <Text style={styles.bulletTeken}>•</Text>
            <Text style={{ flex: 1 }}>
              <Opgemaakt tekst={b.tekst} onderstreept={onderstreept} />
            </Text>
          </View>
        ) : (
          <Text key={j} style={vet ? [styles.para, { fontWeight: 700 }] : styles.para}>
            <Opgemaakt tekst={b.tekst} onderstreept={onderstreept} />
          </Text>
        ),
      )}
    </>
  );
}

/** Tekst met eenvoudige opmaak (## kop, - opsomming, **vet**) voor de introductie- en slotpagina. */
function OpmaakTekst({ tekst }: { tekst: string }) {
  // Tussenkoppen ("## …") splitsen de tekst; de stukken ertussen gaan door blokken().
  const stukken: { kop?: string; tekst: string }[] = [{ tekst: "" }];
  for (const regel of linksAlsTekst(tekst).split("\n")) {
    const kop = /^#{2,3}\s+(.+)$/.exec(regel.trim());
    if (kop) stukken.push({ kop: kop[1], tekst: "" });
    else stukken[stukken.length - 1].tekst += `${regel}\n`;
  }
  return (
    <>
      {stukken.map((st, i) => (
        <View key={i}>
          {st.kop ? (
            <Text style={styles.losKop} minPresenceAhead={40}>
              {zonderOpmaak(st.kop)}
            </Text>
          ) : null}
          <Blokken items={blokken(st.tekst)} />
        </View>
      ))}
    </>
  );
}

/** Een alinea die helemaal cursief is ("*Draag kousen …*"): een tip, links in roze. */
function isTip(b: Blok): boolean {
  if (b.type !== "para") return false;
  const delen = inlineDelen(b.tekst);
  return delen.length === 1 && delen[0].cursief;
}

interface GroepBeeld extends PdfBeeld {
  /** Vet onderschrift (het silhouet onder de silhouettekening). */
  label?: string;
}

interface Groep {
  secties: { sectie: PdfSectie; tekst: Blok[] }[];
  beelden: GroepBeeld[];
  tips: string[];
}

/**
 * Verdeelt de secties in groepen: een sectie met beelden plus de secties zonder
 * beelden die erop volgen. De beelden van een groep staan links naast al die
 * teksten, zoals in het origineel (bijv. schoenen en tas naast kleuren, sjaals,
 * riemen, schoenen en tassen). Secties vóór de eerste met beelden horen bij de eerste groep.
 */
export function maakGroepen(secties: PdfSectie[], silhouetLabel: string): Groep[] {
  const groepen: Groep[] = [];
  for (const s of secties) {
    const beelden = s.beelden ?? [];
    const huidig = groepen.at(-1);
    // Kleine onderdelen met een paar beelden (schoenen, tassen) delen een groep.
    const klein = (g: Groep) => g.beelden.length + beelden.length <= 3 && tekstHoogte(g) < 250 && s.tekst.length < 600;
    const groep = !huidig || (beelden.length > 0 && huidig.beelden.length > 0 && !klein(huidig)) ? null : huidig;
    const doel = groep ?? { secties: [], beelden: [], tips: [] };
    if (!groep) groepen.push(doel);
    const alles = blokken(linksAlsTekst(s.tekst));
    doel.secties.push({ sectie: s, tekst: alles.filter((b) => !isTip(b)) });
    doel.tips.push(...alles.filter(isTip).map((b) => inlineDelen(b.tekst)[0].tekst));
    beelden.forEach((b, i) =>
      doel.beelden.push(s.soort === "silhouet" && i === 0 && silhouetLabel ? { ...b, label: silhouetLabel } : b),
    );
  }
  return groepen;
}

/** Geschatte hoogte van een stuk tekst in de tekstkolom (Arial 10pt: ~62 tekens per regel). */
function regels(tekst: string, tekensPerRegel: number): number {
  return Math.max(1, Math.ceil(zonderOpmaak(tekst).length / tekensPerRegel));
}

function tekstHoogte(groep: Groep): number {
  let h = 0;
  for (const { sectie, tekst } of groep.secties) {
    h += REGEL + 12;
    for (const b of tekst) h += b.type === "bullet" ? regels(b.tekst, 54) * REGEL + 1 : regels(b.tekst, 62) * REGEL + 6;
    if (!sectie.kop) h -= REGEL;
  }
  return h;
}

/**
 * Hoeveel beelden links naast de tekst komen: zolang de kolom nog niet zo lang
 * is als de tekst. De rest komt in rijen onder de tekst.
 */
export function beeldenNaastTekst(groep: Groep): number {
  const tips = groep.tips.reduce((h, t) => h + regels(t, 24) * REGEL + 16, 0);
  const ruimte = tekstHoogte(groep) - tips;
  let gebruikt = 0;
  let aantal = 0;
  for (const b of groep.beelden) {
    const hoogte = BEELD.hoogte + 10 + (b.bijschrift ? 14 : 0) + (b.label ? 18 : 0);
    if (aantal > 0 && gebruikt + hoogte / 2 > ruimte) break;
    gebruikt += hoogte;
    aantal++;
  }
  // Eén beeld over: dat gaat ook in de kolom (geen rij met één beeld).
  return groep.beelden.length - aantal <= 1 ? groep.beelden.length : aantal;
}

/** Geschatte hoogte van een hele groep: tekst of beeldkolom, plus de beelden eronder. */
function groepHoogte(groep: Groep, naast: number): number {
  const kolom = groep.beelden.slice(0, naast).reduce((h, b) => h + BEELD.hoogte + 10 + (b.bijschrift ? 14 : 0), 0);
  const rijen = Math.ceil((groep.beelden.length - naast) / PER_RIJ);
  return Math.max(tekstHoogte(groep), kolom) + rijen * (TEGEL.hoogte + 26);
}

/** Beelden in rijen van PER_RIJ. */
function rijenVan<T>(lijst: T[]): T[][] {
  const rijen: T[][] = [];
  for (let i = 0; i < lijst.length; i += PER_RIJ) rijen.push(lijst.slice(i, i + PER_RIJ));
  return rijen;
}

function Beeld({ beeld, stijl }: { beeld: GroepBeeld; stijl: Style }) {
  // react-pdf Image (geen HTML img); alt bestaat hier niet.
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={beeld.src} style={stijl} />;
}

/** Datum en bedrijfsnaam boven, de code van het type onder elke pagina. */
function Rand({ maand, kop, voet }: { maand: string; kop: string; voet: string }) {
  return (
    <>
      <Text style={styles.kopLinks} fixed>
        {maand}
      </Text>
      <Text style={styles.kopRechts} fixed>
        {kop}
      </Text>
      <Text style={styles.voet} fixed>
        {voet}
      </Text>
    </>
  );
}

export function AdviesPdf({
  klantnaam,
  datum,
  sleutel,
  titel,
  secties,
  silhouet,
  merk = MERK_STANDAARD,
  teksten = standaardAdviesPdfTeksten(),
}: AdviesPdfProps) {
  const t = teksten.voorpagina;
  const bedrijfsnaam = merk.bedrijfsnaam?.trim() || BEDRIJFSNAAM_STANDAARD;
  const voornaam = klantnaam.trim().split(/\s+/)[0] ?? "";
  const rand = {
    maand: datum.replace(/^\d{1,2}\s+/, ""),
    kop: vulIn(t.koptekst, { bedrijf: bedrijfsnaam, type: sleutel }),
    voet: vulIn(t.voettekst, { bedrijf: bedrijfsnaam, type: sleutel }),
  };
  const metNaam = (tekst: string) => vulIn(tekst, { naam: klantnaam });
  const groepen = maakGroepen(secties, silhouet ? vulIn(t.silhouet, { letter: silhouet.letter, silhouet: silhouet.naam }) : "");
  const intro = teksten.intro;
  const toonIntro = intro.tekst.trim() !== "";
  const slot = teksten.slot;
  const slotBlokken = [slot.over, slot.contact].filter((b) => b.trim());
  const toonSlot = Boolean(slot.titel.trim() || slotBlokken.length || slot.oproep.trim() || slot.disclaimer.trim());

  return (
    <Document title={`${zonderOpmaak(t.titel)} – ${titel}`} author={bedrijfsnaam}>
      {/* Voorpagina: groene baan, logo en krullen (beeld) met de titel erop. */}
      <Page size="A4" style={styles.voorpagina}>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src={VOORPAGINA} style={styles.voorpaginaBeeld} />
        <Text style={styles.voorpaginaTitel}>{zonderOpmaak(t.titel)}</Text>
      </Page>

      {/* Optionele introductie (Beheer → Teksten → PDF-advies) */}
      {toonIntro && (
        <Page size="A4" style={styles.page}>
          <Rand {...rand} />
          {intro.bovenschrift.trim() ? <Text style={{ color: kleur.grijs, marginBottom: 4 }}>{metNaam(intro.bovenschrift)}</Text> : null}
          {intro.titel.trim() ? <TitelMetAccent tekst={metNaam(intro.titel)} style={styles.losTitel} /> : null}
          <OpmaakTekst tekst={metNaam(intro.tekst)} />
        </Page>
      )}

      {/* Advies */}
      <Page size="A4" style={styles.page}>
        <Rand {...rand} />
        {t.aanhef.trim() ? <Text style={styles.aanhef}>{vulIn(t.aanhef, { naam: voornaam })}</Text> : null}
        {groepen.map((g, i) => {
          const naast = beeldenNaastTekst(g);
          const onder = g.beelden.slice(naast);
          // Zoals in het origineel: een groot onderdeel (broeken, rokken, tops …)
          // begint op een nieuwe pagina; een kleine groep blijft bij elkaar.
          const groot = groepHoogte(g, naast) > 420;
          return (
            <View key={i} break={i > 0 && groot} wrap={groot}>
              <View style={styles.groep}>
                <View style={styles.beeldkolom}>
                  {g.beelden.slice(0, naast).map((b, k) => (
                    <View key={k} style={styles.beeldKader} wrap={false}>
                      <Beeld beeld={b} stijl={styles.beeld} />
                      {b.label ? <Text style={styles.silhouetLabel}>{b.label}</Text> : null}
                      {b.bijschrift ? <Text style={[styles.bijschrift, { width: BEELD.breedte }]}>{b.bijschrift}</Text> : null}
                    </View>
                  ))}
                  {g.tips.map((tip, k) => (
                    <Text key={k} style={styles.tip}>
                      {tip}
                    </Text>
                  ))}
                </View>
                <View style={styles.tekstkolom}>
                  {g.secties.map(({ sectie, tekst }, k) => (
                    <View key={k} style={styles.sectie}>
                      {sectie.kop.trim() && sectie.soort !== "silhouet" ? (
                        <Text style={styles.sectieKop} minPresenceAhead={30}>
                          {zonderOpmaak(sectie.kop)}
                          {sectie.soort === "kenmerken" && !/[:.?!]$/.test(sectie.kop.trim()) ? ":" : ""}
                        </Text>
                      ) : null}
                      <Blokken items={tekst} onderstreept vet={sectie.soort === "silhouet"} />
                    </View>
                  ))}
                </View>
              </View>
              {/* Vaste rijen (geen flexWrap): een rij die naar de volgende pagina
                  gaat, verschoof anders bij react-pdf. */}
              {rijenVan(onder).map((rij, r) => (
                <View key={r} style={styles.beeldRij} wrap={false}>
                  {rij.map((b, k) => (
                    <View key={k} style={[styles.tegel, { marginRight: k === PER_RIJ - 1 ? 0 : TEGEL.tussen }]}>
                      <Beeld beeld={b} stijl={styles.tegelBeeld} />
                      {b.label ? <Text style={styles.silhouetLabel}>{b.label}</Text> : null}
                      {b.bijschrift ? <Text style={[styles.bijschrift, { width: TEGEL.breedte }]}>{b.bijschrift}</Text> : null}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );
        })}
      </Page>

      {/* Optionele slotpagina (Beheer → Teksten → PDF-advies) */}
      {toonSlot && (
        <Page size="A4" style={styles.page}>
          <Rand {...rand} />
          {slot.titel.trim() ? <TitelMetAccent tekst={metNaam(slot.titel)} style={styles.losTitel} /> : null}
          {slotBlokken.map((b, i) => (
            <View key={i} style={styles.slotBlok}>
              <OpmaakTekst tekst={metNaam(b)} />
            </View>
          ))}
          {slot.oproep.trim() ? (
            <View style={styles.slotOproep} wrap={false}>
              <OpmaakTekst tekst={metNaam(slot.oproep)} />
            </View>
          ) : null}
          {slot.disclaimer.trim() ? <Text style={styles.disclaimer}>{metNaam(slot.disclaimer)}</Text> : null}
        </Page>
      )}
    </Document>
  );
}
