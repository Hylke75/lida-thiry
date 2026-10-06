// Beschrijving van de instellingen voor het beheerscherm: label, uitleg en soort
// invoer per bekende sleutel, plus validatie. Onbekende sleutels krijgen een
// gewoon tekstveld met de omschrijving uit de database als uitleg.

import { INSTELLING_SLEUTELS as AFSPRAAK_SLEUTELS } from "./afspraken/regels";
import { geldigEmail } from "@/lib/email";
import { VERKOOP_STANDAARD } from "./verkoop/regels";
import { CADEAUBON_SLEUTELS } from "./cadeaubon/regels";

type VeldSoort = "euro" | "geheel_getal" | "email" | "tekst" | "tekstvak" | "keuze";

export interface InstellingVeld {
  label: string;
  uitleg?: string;
  soort: VeldSoort;
  /** Voor getallen. */
  min?: number;
  max?: number;
  /** Voor keuzevelden. */
  opties?: { waarde: string; label: string }[];
  /** Leeg laten mag niet. */
  verplicht?: boolean;
  /** Waarde zolang de sleutel nog niet in de database staat (dan wordt hij bij opslaan aangemaakt). */
  standaard?: string;
}

export const INSTELLING_VELDEN: Record<string, InstellingVeld> = {
  prijs_cent: {
    label: "Prijs van de test (in euro)",
    uitleg: "Het bedrag dat een klant betaalt, bijvoorbeeld 29,95. Laat leeg zolang de prijs nog niet vaststaat.",
    soort: "euro",
  },
  valuta: {
    label: "Valuta",
    uitleg: "Laat dit op EUR staan.",
    soort: "tekst",
    verplicht: true,
  },
  token_geldigheid_dagen: {
    label: "Geldigheid van de testlink (dagen)",
    uitleg: "Zo lang kan een klant na betaling de test invullen met de link uit de e-mail.",
    soort: "geheel_getal",
    min: 1,
    max: 365,
    verplicht: true,
  },
  bewaartermijn_maten_dagen: {
    label: "Bewaartermijn lichaamsmaten (dagen)",
    uitleg:
      "Na zoveel dagen worden de maten van een klant automatisch gewist (privacy). De bestelling en het type blijven bewaard.",
    soort: "geheel_getal",
    min: 1,
    max: 3650,
    verplicht: true,
  },
  review_na_dagen: {
    label: "Om een review vragen na (dagen)",
    uitleg:
      "Zoveel dagen nadat het advies is verzonden, krijgt de klant automatisch één mail met de vraag om een review. Klanten van wie het advies langer geleden is verzonden dan ‘Reviewuitnodiging: niet meer na’ (standaard 60 dagen), krijgen geen automatische mail; die kun je zelf uitnodigen in Beheer → Reviews.",
    soort: "geheel_getal",
    min: 1,
    max: 45,
    verplicht: true,
  },
  zandloper_variant: {
    label: "Rekenregel zandloper",
    uitleg:
      "Bepaalt hoe de test tussen zandloper-figuren onderscheid maakt. 'Excel' is de regel uit jouw eigen rekenblad en is de standaard die je op 28-9 hebt gekozen; 'FFIT' is de regel uit de oorspronkelijke FFIT-bron. Wijzig dit alleen als je zeker weet dat je de andere regel wilt.",
    soort: "keuze",
    opties: [
      { waarde: "excel", label: "Excel (mijn rekenblad, aanbevolen)" },
      { waarde: "ffit", label: "FFIT (oorspronkelijke bron)" },
    ],
    verplicht: true,
  },
  adviseur_email: {
    label: "E-mailadres voor foutmeldingen",
    uitleg: "Hierheen sturen we een bericht als er iets misgaat, bijvoorbeeld als een advies-PDF of e-mail niet verstuurd kon worden.",
    soort: "email",
  },
  bedrijfsnaam: {
    label: "Bedrijfsnaam",
    uitleg: "Zoals die op de website, in e-mails en op facturen staat.",
    soort: "tekst",
  },
  bedrijf_adres: {
    label: "Adres",
    uitleg: "Straat en huisnummer, postcode en plaats.",
    soort: "tekstvak",
  },
  kvk_nummer: {
    label: "KvK-nummer",
    soort: "tekst",
  },
  btw_nummer: {
    label: "Btw-nummer",
    soort: "tekst",
  },
  nb_max_per_dag: {
    label: "Nieuwsbrief: maximaal aantal mails per dag",
    uitleg:
      "Telt per kalenderdag. Resend telt álle mails mee, ook die bij bestellingen, afspraken en contact: houd ongeveer 30% van je Resend-limiet vrij (gratis abonnement: 100 per dag, dus hier hooguit 70). Wat erboven komt, gaat de volgende dag automatisch verder.",
    soort: "geheel_getal",
    min: 1,
    max: 100000,
  },
  nb_meten: {
    label: "Nieuwsbrief: opens en kliks meten",
    uitleg: "Meet wie een nieuwsbrief opent en op welke links geklikt wordt. Vermeld dit in je privacyverklaring.",
    soort: "keuze",
    opties: [
      { waarde: "ja", label: "Ja, meten" },
      { waarde: "nee", label: "Nee, niet meten" },
    ],
  },
  betaalherinnering_na_uren: {
    label: "Betaalherinnering na (uren)",
    uitleg:
      "Na zoveel uur krijgt iemand die een bestelling begon maar niet betaalde één vriendelijke herinnering (binnen 7 dagen; niet als er op hetzelfde adres al betaald is). Standaard 24.",
    soort: "geheel_getal",
    min: 1,
    max: 144,
  },
  contact_email: {
    label: "Contact-e-mailadres",
    uitleg: "Het adres dat klanten op de website zien om contact op te nemen.",
    soort: "email",
  },
  mfa_verplicht: {
    label: "Tweestapsverificatie verplicht",
    uitleg:
      "Bij ‘Ja’ moet iedere beheerder eerst een authenticator-app koppelen (Instellingen → Beveiliging) voordat die iets anders in het beheer kan doen. Wie al een app heeft gekoppeld, gebruikt die altijd bij het inloggen.",
    soort: "keuze",
    opties: [
      { waarde: "nee", label: "Nee, ieder kiest zelf" },
      { waarde: "ja", label: "Ja, verplicht voor iedereen" },
    ],
    verplicht: true,
  },
  // Verkoop: btw, namen en termijnen (standaardwaarden: src/lib/verkoop/regels.ts).
  btw_procent: {
    label: "Btw-tarief (%)",
    uitleg:
      "Het btw-percentage op facturen, creditnota's en in de exports. Prijzen zijn inclusief btw; de factuur rekent het btw-deel terug. Standaard 21. Gebruik 0 alleen als je bent vrijgesteld (bijv. de kleineondernemersregeling).",
    soort: "geheel_getal",
    min: 0,
    max: 99,
    verplicht: true,
    standaard: VERKOOP_STANDAARD.btw_procent,
  },
  product_naam: {
    label: "Productnaam",
    uitleg:
      "Hoe de test heet in de bevestigingsmail, op de factuur en in de gegevens voor zoekmachines. Standaard: ‘Persoonlijke kledingadviestest’.",
    soort: "tekst",
    verplicht: true,
    standaard: VERKOOP_STANDAARD.product_naam,
  },
  betaling_omschrijving: {
    label: "Omschrijving van de betaling",
    uitleg:
      "Wat de klant bij Mollie en op het bankafschrift ziet. Bij een cadeaubon komt er ‘Cadeaubon’ voor. Standaard: ‘Kledingadviestest – Lida Thiry’.",
    soort: "tekst",
    verplicht: true,
    standaard: VERKOOP_STANDAARD.betaling_omschrijving,
  },
  betaalherinnering_max_dagen: {
    label: "Betaalherinnering: niet meer na (dagen)",
    uitleg: "Bestellingen die langer geleden zijn begonnen, krijgen geen betaalherinnering meer. Standaard 7.",
    soort: "geheel_getal",
    min: 2,
    max: 60,
    verplicht: true,
    standaard: VERKOOP_STANDAARD.betaalherinnering_max_dagen,
  },
  betaalherinnering_link_dagen: {
    label: "Betaalherinnering: link geldig (dagen)",
    uitleg: "Zo lang kan de klant met de link uit de betaalherinnering de betaling nog afronden. Standaard 7.",
    soort: "geheel_getal",
    min: 1,
    max: 60,
    verplicht: true,
    standaard: VERKOOP_STANDAARD.betaalherinnering_link_dagen,
  },
  review_max_dagen: {
    label: "Reviewuitnodiging: niet meer na (dagen)",
    uitleg:
      "Klanten van wie het advies langer geleden is verzonden, krijgen geen automatische reviewmail meer (die kun je zelf uitnodigen in Beheer → Reviews). Standaard 60.",
    soort: "geheel_getal",
    min: 14,
    max: 365,
    verplicht: true,
    standaard: VERKOOP_STANDAARD.review_max_dagen,
  },
  testlink_zichtbaar_uren: {
    label: "Testlink op de bedankpagina (uren)",
    uitleg:
      "Zo lang na het betalen toont de bedankpagina de knop naar de test. Daarna staat de link alleen nog in de e-mail (de bedankpagina kan in de browsergeschiedenis blijven staan). Standaard 2.",
    soort: "geheel_getal",
    min: 0,
    max: 72,
    verplicht: true,
    standaard: VERKOOP_STANDAARD.testlink_zichtbaar_uren,
  },
};

/** Instellingen die niet meer gebruikt worden en daarom niet getoond worden. */
export const VEROUDERDE_INSTELLINGEN = new Set(["doorlooptijd_werkdagen"]);

/** Instellingen met een eigen beheerscherm (Website → Instellingen); niet op de algemene pagina. */
export const WEBSITE_INSTELLINGEN = new Set([
  "site_naam",
  "site_omschrijving",
  "logo_url",
  "favicon_url",
  "deel_afbeelding_url",
  "social_instagram",
  "social_facebook",
  "social_linkedin",
  "social_pinterest",
  "social_youtube",
  "social_tiktok",
  "homepage_indeling",
]);

/**
 * Instellingen met een eigen, gevalideerd beheerscherm (Afspraken → Instellingen);
 * niet als vrije tekst op de algemene pagina.
 */
export const AFSPRAAK_INSTELLINGEN: ReadonlySet<string> = new Set(Object.values(AFSPRAAK_SLEUTELS));

/**
 * Instellingen met een eigen, gevalideerd beheerscherm (Cadeaubonnen → Instellingen);
 * niet als vrije tekst op de algemene pagina.
 */
export const CADEAUBON_INSTELLINGEN: ReadonlySet<string> = new Set(Object.values(CADEAUBON_SLEUTELS));

/** Veld voor een sleutel; onbekende sleutels worden een gewoon tekstveld. */
export function veldVoor(sleutel: string, omschrijving?: string | null): InstellingVeld {
  return (
    INSTELLING_VELDEN[sleutel] ?? {
      label: sleutel.charAt(0).toUpperCase() + sleutel.slice(1).replace(/_/g, " "),
      uitleg: omschrijving ?? undefined,
      soort: "tekst",
    }
  );
}

/** Opgeslagen waarde -> wat in het invoerveld staat. */
export function naarInvoer(veld: InstellingVeld, waarde: string | null): string {
  if (waarde == null) return "";
  if (veld.soort === "euro") {
    const cent = Number(waarde);
    if (!Number.isFinite(cent)) return waarde;
    return (cent / 100).toFixed(2).replace(".", ",");
  }
  return waarde;
}

/** Invoer -> op te slaan waarde, of een foutmelding in gewone taal. */
export function vanInvoer(
  veld: InstellingVeld,
  invoer: string,
): { ok: true; waarde: string | null } | { ok: false; fout: string } {
  const v = invoer.trim();
  if (v === "") {
    return veld.verplicht
      ? { ok: false, fout: `${veld.label}: dit veld mag niet leeg zijn.` }
      : { ok: true, waarde: null };
  }
  switch (veld.soort) {
    case "euro": {
      const schoon = v.replace(/^€\s*/, "").replace(/\s/g, "");
      if (!/^\d+([.,]\d{1,2})?$/.test(schoon)) {
        return { ok: false, fout: `${veld.label}: vul een bedrag in, bijvoorbeeld 29,95.` };
      }
      const cent = Math.round(Number(schoon.replace(",", ".")) * 100);
      if (cent <= 0) return { ok: false, fout: `${veld.label}: het bedrag moet groter dan 0 zijn.` };
      return { ok: true, waarde: String(cent) };
    }
    case "geheel_getal": {
      if (!/^\d+$/.test(v)) return { ok: false, fout: `${veld.label}: vul een heel getal in.` };
      const n = Number(v);
      if ((veld.min != null && n < veld.min) || (veld.max != null && n > veld.max)) {
        return { ok: false, fout: `${veld.label}: kies een getal tussen ${veld.min} en ${veld.max}.` };
      }
      return { ok: true, waarde: String(n) };
    }
    case "email":
      if (!geldigEmail(v)) return { ok: false, fout: `${veld.label}: dit is geen geldig e-mailadres.` };
      return { ok: true, waarde: v };
    case "keuze":
      if (!veld.opties?.some((o) => o.waarde === v)) {
        return { ok: false, fout: `${veld.label}: kies een van de opties.` };
      }
      return { ok: true, waarde: v };
    default:
      return { ok: true, waarde: v };
  }
}
