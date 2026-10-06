// Afleverbaarheid van e-mail: staan SPF, DKIM, DMARC en de MX van het
// verzend-subdomein goed in de DNS van het afzenderdomein? Puur: krijgt de
// gevonden DNS-records binnen en geeft per controle een oordeel met uitleg.
// Het opzoeken gebeurt in afleverbaarheid-dns.ts.
//
// Resend (gebouwd op Amazon SES) vraagt bij het toevoegen van een domein om:
// - MX  send.<domein>                → feedback-smtp.<regio>.amazonses.com (prioriteit 10)
// - TXT send.<domein>                → v=spf1 include:amazonses.com ~all
// - TXT resend._domainkey.<domein>   → p=… (de DKIM-sleutel)
// en raadt een DMARC-record aan op _dmarc.<domein>. De precieze waarden staan in
// het Resend-dashboard onder Domains.

export type Oordeel = "goed" | "let-op" | "ontbreekt";

export interface Controle {
  id: "spf" | "dkim" | "dmarc" | "mx";
  label: string;
  oordeel: Oordeel;
  /** Wat we vonden, in gewone taal. */
  uitleg: string;
  /** Wat je kunt toevoegen of aanpassen (als dat nodig is). */
  actie?: { type: "TXT" | "MX" | "CNAME"; naam: string; waarde: string; toelichting?: string };
  /** De gevonden waarde(n), ter controle. */
  gevonden: string[];
}

export type Afzender =
  | { soort: "geen" }
  | { soort: "standaard"; adres: string }
  | { soort: "eigen"; adres: string; domein: string };

/** Het e-mailadres uit "Naam <adres>" of een kaal adres; ongeldig → null. */
export function adresUitAfzender(van: string | null | undefined): string | null {
  const t = (van ?? "").trim();
  if (!t) return null;
  const m = t.match(/<([^<>\s]+@[^<>\s]+)>/) ?? t.match(/^([^\s<>]+@[^\s<>]+)$/);
  if (!m) return null;
  return m[1].toLowerCase();
}

/** Welk domein de nieuwsbrief verstuurt (uit RESEND_VAN). resend.dev = nog geen eigen domein. */
export function afzenderDomein(van: string | null | undefined): Afzender {
  const adres = adresUitAfzender(van);
  if (!adres) return van?.trim() ? { soort: "geen" } : { soort: "standaard", adres: "onboarding@resend.dev" };
  const domein = adres.split("@")[1].replace(/\.$/, "");
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domein)) return { soort: "geen" };
  if (domein === "resend.dev" || domein.endsWith(".resend.dev")) return { soort: "standaard", adres };
  return { soort: "eigen", adres, domein };
}

/** TXT-records komen als stukjes (strings van max. 255 tekens); plak ze per record aan elkaar. */
export function plakTxt(records: readonly (readonly string[])[]): string[] {
  return records.map((r) => r.join("").trim());
}

const SES_INCLUDE = /(^|\s)include:amazonses\.com(\s|$)/i;

/**
 * SPF: op send.<domein> (zoals Resend vraagt) of, als dat er niet is, op het
 * domein zelf. Goed = een SPF-record met include:amazonses.com.
 */
export function beoordeelSpf(domein: string, opSubdomein: readonly string[], opDomein: readonly string[]): Controle {
  const naam = `send.${domein}`;
  const spfSub = opSubdomein.filter((t) => /^v=spf1(\s|$)/i.test(t));
  const spfDom = opDomein.filter((t) => /^v=spf1(\s|$)/i.test(t));
  const actie = { type: "TXT" as const, naam, waarde: "v=spf1 include:amazonses.com ~all" };
  const basis = { id: "spf" as const, label: "SPF (wie mag mailen namens je domein)" };

  if (spfSub.length > 1 || spfDom.length > 1) {
    return {
      ...basis,
      oordeel: "let-op",
      uitleg:
        "Er staan meerdere SPF-records op dezelfde naam. Dat is ongeldig: mailservers negeren SPF dan helemaal. Voeg ze samen tot één record.",
      gevonden: [...spfSub, ...spfDom],
    };
  }
  if (spfSub.length === 1) {
    return SES_INCLUDE.test(spfSub[0])
      ? { ...basis, oordeel: "goed", uitleg: `In orde: ${naam} staat Resend (Amazon SES) toe om te verzenden.`, gevonden: spfSub }
      : {
          ...basis,
          oordeel: "let-op",
          uitleg: `Er staat een SPF-record op ${naam}, maar zonder include:amazonses.com. Resend verzendt via Amazon SES; voeg die toe.`,
          actie,
          gevonden: spfSub,
        };
  }
  if (spfDom.length === 1 && SES_INCLUDE.test(spfDom[0])) {
    return {
      ...basis,
      oordeel: "goed",
      uitleg: `In orde: het SPF-record van ${domein} staat Resend (Amazon SES) toe.`,
      gevonden: spfDom,
    };
  }
  return {
    ...basis,
    oordeel: "ontbreekt",
    uitleg: spfDom.length
      ? `${domein} heeft wel een SPF-record, maar Resend verzendt vanaf ${naam}. Daar ontbreekt het SPF-record nog.`
      : `Er is geen SPF-record gevonden. Zonder SPF belanden mails sneller in de spam.`,
    actie,
    gevonden: spfDom,
  };
}

/** DKIM: resend._domainkey.<domein> als TXT met een sleutel (p=…), of als CNAME. */
export function beoordeelDkim(domein: string, txt: readonly string[], cname: readonly string[]): Controle {
  const naam = `resend._domainkey.${domein}`;
  const basis = { id: "dkim" as const, label: "DKIM (digitale handtekening)" };
  const sleutel = txt.find((t) => /(^|;)\s*p=[A-Za-z0-9+/=]{20,}/.test(t));
  if (sleutel) {
    return { ...basis, oordeel: "goed", uitleg: `In orde: ${naam} bevat de DKIM-sleutel van Resend.`, gevonden: [kort(sleutel)] };
  }
  if (cname.length) {
    return {
      ...basis,
      oordeel: "goed",
      uitleg: `${naam} verwijst door (CNAME) naar ${cname[0]}. Controleer in het Resend-dashboard of het domein als 'Verified' staat.`,
      gevonden: cname.map(kort),
    };
  }
  return {
    ...basis,
    oordeel: "ontbreekt",
    uitleg: txt.length
      ? `Op ${naam} staat wel iets, maar geen geldige DKIM-sleutel.`
      : `Er is geen DKIM-record gevonden. Met DKIM kunnen ontvangers controleren dat de mail echt van jou komt en onderweg niet is aangepast.`,
    actie: {
      type: "TXT",
      naam,
      waarde: "p=… (kopieer de volledige waarde uit Resend → Domains)",
      toelichting: "De sleutel is uniek voor jouw domein; je vindt hem in het Resend-dashboard.",
    },
    gevonden: txt.map(kort),
  };
}

/** De policy (p=) uit een DMARC-record, kleine letters; geen → null. */
export function dmarcPolicy(record: string): string | null {
  const m = record.match(/(^|;)\s*p\s*=\s*([a-z]+)/i);
  return m ? m[2].toLowerCase() : null;
}

/** DMARC: _dmarc.<domein> als TXT dat begint met v=DMARC1. */
export function beoordeelDmarc(domein: string, txt: readonly string[]): Controle {
  const naam = `_dmarc.${domein}`;
  const basis = { id: "dmarc" as const, label: "DMARC (wat te doen met nagemaakte mail)" };
  const records = txt.filter((t) => /^v=DMARC1(\s|;|$)/i.test(t));
  const actie = {
    type: "TXT" as const,
    naam,
    waarde: "v=DMARC1; p=none;",
    toelichting:
      "Begin met p=none (alleen waarnemen). Gaat alles goed, dan kun je later naar p=quarantine. Gmail en Yahoo eisen sinds 2024 een DMARC-record.",
  };
  if (records.length === 0) {
    return { ...basis, oordeel: "ontbreekt", uitleg: "Er is geen DMARC-record gevonden.", actie, gevonden: [] };
  }
  if (records.length > 1) {
    return {
      ...basis,
      oordeel: "let-op",
      uitleg: "Er staan meerdere DMARC-records; dat is ongeldig. Houd er één over.",
      gevonden: records,
    };
  }
  const p = dmarcPolicy(records[0]);
  if (!p || !["none", "quarantine", "reject"].includes(p)) {
    return {
      ...basis,
      oordeel: "let-op",
      uitleg: "Het DMARC-record mist een geldige policy (p=none, p=quarantine of p=reject).",
      actie,
      gevonden: records,
    };
  }
  return {
    ...basis,
    oordeel: "goed",
    uitleg:
      p === "none"
        ? "In orde: er is een DMARC-record (p=none: alleen waarnemen). Later kun je strenger worden met p=quarantine."
        : `In orde: er is een DMARC-record (p=${p}).`,
    gevonden: records,
  };
}

/** MX van send.<domein>: nodig voor bounces en klachten (Amazon SES feedback). */
export function beoordeelMx(domein: string, mx: readonly { exchange: string; priority: number }[]): Controle {
  const naam = `send.${domein}`;
  const basis = { id: "mx" as const, label: "MX van het verzend-subdomein (bounces)" };
  const gevonden = mx.map((m) => `${m.priority} ${m.exchange}`);
  if (mx.some((m) => /(^|\.)amazonses\.com\.?$/i.test(m.exchange))) {
    return { ...basis, oordeel: "goed", uitleg: `In orde: bounces en klachten voor ${naam} komen bij Resend terecht.`, gevonden };
  }
  return {
    ...basis,
    oordeel: mx.length ? "let-op" : "ontbreekt",
    uitleg: mx.length
      ? `${naam} heeft een MX-record, maar niet naar Amazon SES. Dan ziet Resend geen bounces en klachten.`
      : `Er is geen MX-record op ${naam}. Resend gebruikt dat om onbestelbare mail (bounces) te verwerken.`,
    actie: {
      type: "MX",
      naam,
      waarde: "feedback-smtp.eu-west-1.amazonses.com (prioriteit 10)",
      toelichting: "De regio (bijv. eu-west-1 of us-east-1) staat in het Resend-dashboard bij je domein.",
    },
    gevonden,
  };
}

export interface DnsGegevens {
  spfSubdomein: string[];
  spfDomein: string[];
  dkimTxt: string[];
  dkimCname: string[];
  dmarc: string[];
  mx: { exchange: string; priority: number }[];
}

/** Alle controles op volgorde. */
export function beoordeel(domein: string, d: DnsGegevens): Controle[] {
  return [
    beoordeelSpf(domein, d.spfSubdomein, d.spfDomein),
    beoordeelDkim(domein, d.dkimTxt, d.dkimCname),
    beoordeelDmarc(domein, d.dmarc),
    beoordeelMx(domein, d.mx),
  ];
}

/** Het totaaloordeel: alles goed, of het slechtste dat we vonden. */
export function totaal(controles: readonly Controle[]): Oordeel {
  if (controles.some((c) => c.oordeel === "ontbreekt")) return "ontbreekt";
  if (controles.some((c) => c.oordeel === "let-op")) return "let-op";
  return "goed";
}

function kort(s: string): string {
  return s.length > 90 ? `${s.slice(0, 87)}…` : s;
}
