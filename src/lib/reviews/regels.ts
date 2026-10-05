// Reviews (beoordelingen): pure regels zonder database, zodat ze te testen zijn
// en ook in clientcomponenten (het formulier) gebruikt kunnen worden.

export const REVIEW_STATUSSEN = ["ingevuld", "goedgekeurd", "afgewezen", "uitgenodigd"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSSEN)[number];

export const REVIEW_STATUS_LABEL: Readonly<Record<ReviewStatus, string>> = {
  ingevuld: "Nieuw ingevuld",
  goedgekeurd: "Goedgekeurd",
  afgewezen: "Afgewezen",
  uitgenodigd: "Uitgenodigd",
};

export function isReviewStatus(w: unknown): w is ReviewStatus {
  return typeof w === "string" && (REVIEW_STATUSSEN as readonly string[]).includes(w);
}

/** De klant kan haar reactie aanpassen zolang die nog niet is beoordeeld. */
export function magKlantBewerken(status: string): boolean {
  return status === "uitgenodigd" || status === "ingevuld";
}

export const REVIEW_MAX = { naam: 80, tekst: 1000 } as const;
export const REVIEW_MIN_TEKST = 20;

/** Token uit de link in de uitnodiging: 64 hexadecimale tekens (standaard in de database). */
export const REVIEW_TOKEN_PATROON = /^[a-f0-9]{64}$/;

/** Id van een review of bestelling (uuid). */
export const ID_PATROON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Een review zoals die op de website staat. */
export interface PubliekeReview {
  id: string;
  naam: string;
  sterren: number;
  tekst: string;
  datum: string | null;
}

// Validatie ----------------------------------------------------------------------

export type ReviewVeld = "sterren" | "tekst" | "naam";

interface ReviewInvoer {
  sterren: number;
  tekst: string;
  naam: string;
  toestemming: boolean;
}

export type ReviewValidatie =
  | { ok: true; waarde: ReviewInvoer }
  | { ok: false; fouten: Partial<Record<ReviewVeld, string>> };

/** Witruimte netjes: regeleinden gelijk, hooguit één lege regel, geen spaties aan de randen. */
function schoonTekst(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function schoonRegel(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Lengte zoals een mens die telt (emoji als één teken). */
function lengte(s: string): number {
  return Array.from(s).length;
}

/** Controleert het reviewformulier (op de client én op de server). */
export function valideerReview(ruw: {
  sterren: unknown;
  tekst: unknown;
  naam: unknown;
  toestemming: unknown;
}): ReviewValidatie {
  const fouten: Partial<Record<ReviewVeld, string>> = {};
  const sterren = typeof ruw.sterren === "number" ? ruw.sterren : Number(String(ruw.sterren ?? ""));
  if (!Number.isInteger(sterren) || sterren < 1 || sterren > 5) {
    fouten.sterren = "Kies een aantal sterren (1 tot en met 5).";
  }
  const tekst = schoonTekst(typeof ruw.tekst === "string" ? ruw.tekst : "");
  if (lengte(tekst) < REVIEW_MIN_TEKST) {
    fouten.tekst = `Schrijf minimaal ${REVIEW_MIN_TEKST} tekens.`;
  } else if (lengte(tekst) > REVIEW_MAX.tekst) {
    fouten.tekst = `Maximaal ${REVIEW_MAX.tekst} tekens.`;
  }
  const naam = schoonRegel(typeof ruw.naam === "string" ? ruw.naam : "");
  if (!naam) fouten.naam = "Vul de naam in die bij je reactie mag staan.";
  else if (lengte(naam) > REVIEW_MAX.naam) fouten.naam = `Maximaal ${REVIEW_MAX.naam} tekens.`;

  const toestemming = ruw.toestemming === true || ruw.toestemming === "on" || ruw.toestemming === "1";
  if (Object.keys(fouten).length) return { ok: false, fouten };
  return { ok: true, waarde: { sterren, tekst, naam, toestemming } };
}

/**
 * Lichte bewerking door de beheerder (typefouten): naam en tekst mogen niet leeg
 * zijn en niet te lang. De minimumlengte geldt hier niet.
 */
export function valideerBeheerBewerking(ruw: {
  naam: unknown;
  tekst: unknown;
}): { ok: true; naam: string; tekst: string } | { ok: false; fout: string } {
  const naam = schoonRegel(typeof ruw.naam === "string" ? ruw.naam : "");
  const tekst = schoonTekst(typeof ruw.tekst === "string" ? ruw.tekst : "");
  if (!naam) return { ok: false, fout: "De naam mag niet leeg zijn." };
  if (!tekst) return { ok: false, fout: "De tekst mag niet leeg zijn." };
  if (lengte(naam) > REVIEW_MAX.naam) return { ok: false, fout: `De naam mag maximaal ${REVIEW_MAX.naam} tekens zijn.` };
  if (lengte(tekst) > REVIEW_MAX.tekst) return { ok: false, fout: `De tekst mag maximaal ${REVIEW_MAX.tekst} tekens zijn.` };
  return { ok: true, naam, tekst };
}

// Naamsuggestie -------------------------------------------------------------------

/** "anna" → "Anna", "DEN HAAG" → "Den Haag"; gemengde schrijfwijze blijft zoals hij is. */
function netjes(s: string): string {
  const t = schoonRegel(s);
  if (!t || (t !== t.toLowerCase() && t !== t.toUpperCase())) return t;
  return t
    .toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, voor: string, letter: string) => voor + letter.toUpperCase());
}

/**
 * Voorstel voor de getoonde naam: "Voornaam, plaats". De voornaam komt uit het
 * adresboek, anders het eerste woord van de naam op de bestelling; de plaats uit
 * het adresboek of het factuuradres. Zonder voornaam: lege tekst.
 */
export function naamSuggestie(bron: {
  voornaam?: string | null;
  klantnaam?: string | null;
  plaats?: string | null;
}): string {
  const voornaam = netjes(bron.voornaam || (bron.klantnaam ?? "").trim().split(/\s+/)[0] || "");
  if (!voornaam) return "";
  const plaats = netjes(bron.plaats ?? "");
  return (plaats ? `${voornaam}, ${plaats}` : voornaam).slice(0, REVIEW_MAX.naam);
}

/** Voornaam voor de aanhef van de uitnodiging ("Beste Anna,"). */
export function voornaamVoorAanhef(klantnaam: string | null | undefined, voornaam?: string | null): string {
  return netjes(voornaam || (klantnaam ?? "").trim().split(/\s+/)[0] || "") || "daar";
}

// Uitnodigen ----------------------------------------------------------------------

export interface KandidaatOrder {
  id: string;
  email: string;
  klantnaam: string;
  status: string;
  afgerond_op: string | null;
  bedrag_cent: number | null;
  kortingscode: string | null;
}

/** De velden waaraan een testbestelling te herkennen is. */
export interface TestbestellingVelden {
  bedrag_cent: number | null;
  kortingscode: string | null;
  email?: string | null;
  mollie_payment_id?: string | null;
}

/**
 * Of een bestelling een testbestelling is (één definitie voor reviews én
 * statistieken): gratis, zonder kortingscode en zonder Mollie-betaling (de
 * testknop in het beheer en GRATIS_TEST maken bestellingen van € 0), of een
 * voorbeeldadres zoals test+…@voorbeeld.nl. Een bestelling die met een
 * cadeaubon/kortingscode op € 0 uitkomt, telt wél mee (die heeft een kortingscode).
 */
export function isTestbestelling(o: TestbestellingVelden): boolean {
  if (!o.bedrag_cent && !o.kortingscode && !o.mollie_payment_id) return true;
  const domein = ((o.email ?? "").split("@")[1] ?? "").trim().toLowerCase();
  return domein === "voorbeeld.nl" || /^example\.(com|org|net)$/.test(domein);
}

const REVIEW_STANDAARD_DAGEN = 7;
/** Bestellingen die langer geleden zijn afgerond, krijgen geen automatische uitnodiging meer. */
const REVIEW_MAX_DAGEN = 60;

/** Het aantal dagen uit de instelling review_na_dagen (ongeldig of leeg = 7, hooguit 180). */
export function leesReviewDagen(waarde: string | null | undefined): number {
  const n = Number((waarde ?? "").trim() || NaN);
  if (!Number.isFinite(n) || n < 0) return REVIEW_STANDAARD_DAGEN;
  return Math.min(180, Math.floor(n));
}

const DAG = 24 * 60 * 60 * 1000;

/**
 * De periode waarin het advies afgerond moet zijn voor een automatische
 * uitnodiging: tussen `naDagen` en 60 dagen geleden (is `naDagen` zelf al bijna
 * 60, dan twee weken erna), zodat bij de eerste keer niet alle oude klanten mail krijgen.
 */
export function reviewVenster(nu: Date, naDagen: number): { van: Date; tot: Date } {
  const max = Math.max(REVIEW_MAX_DAGEN, naDagen + 14);
  return { van: new Date(nu.getTime() - max * DAG), tot: new Date(nu.getTime() - naDagen * DAG) };
}

/**
 * Welke bestellingen een uitnodiging krijgen: advies verzonden, afgerond binnen
 * het venster, geen testbestelling, nog geen review(-rij) en elk e-mailadres
 * maar één keer per ronde.
 */
export function selecteerUitTeNodigen(
  orders: readonly KandidaatOrder[],
  metReview: ReadonlySet<string>,
  nu: Date,
  naDagen: number,
): KandidaatOrder[] {
  const { van, tot } = reviewVenster(nu, naDagen);
  const gezien = new Set<string>();
  const uit: KandidaatOrder[] = [];
  for (const o of orders) {
    if (o.status !== "advies_verzonden" || !o.afgerond_op || metReview.has(o.id)) continue;
    const t = new Date(o.afgerond_op).getTime();
    if (!Number.isFinite(t) || t < van.getTime() || t > tot.getTime()) continue;
    if (isTestbestelling(o)) continue;
    const email = o.email.trim().toLowerCase();
    if (!email.includes("@") || gezien.has(email)) continue;
    gezien.add(email);
    uit.push(o);
  }
  return uit;
}

// Samenvatting -------------------------------------------------------------------

/** Gemiddelde (op één decimaal) en aantal; zonder sterren: gemiddelde 0. */
export function reviewSamenvatting(sterren: readonly (number | null | undefined)[]): {
  gemiddelde: number;
  aantal: number;
} {
  const geldig = sterren.filter((s): s is number => typeof s === "number" && s >= 1 && s <= 5);
  if (!geldig.length) return { gemiddelde: 0, aantal: 0 };
  const som = geldig.reduce((a, b) => a + b, 0);
  return { gemiddelde: Math.round((som / geldig.length) * 10) / 10, aantal: geldig.length };
}

/** "4,5" */
export function cijfer(n: number): string {
  return n.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
