// Rollen en rechten in het beheer. Puur (testbaar): geen database, geen Next.
//
// Drie rollen:
// - eigenaar:  mag alles, ook beheerders, instellingen en het logboek.
// - beheerder: het dagelijkse werk (bestellingen, klanten, afspraken, advies,
//              website, nieuwsbrief). Niet: beheerders, algemene en
//              website-instellingen, het logboek, bestellingen verwijderen en
//              kortingscodes maken/verwijderen (dat kost direct geld).
// - redacteur: alleen inhoud: website (pagina's, homepage, blog, AI, teksten,
//              media, prullenbak), nieuwsbrief (campagnes, formulieren,
//              automatisch, afleverbaarheid; zonder contactenlijst en exports)
//              en reviews (lezen, goedkeuren, bewerken).
//
// Iedereen mag zijn eigen beveiliging (wachtwoord, tweestapsverificatie) regelen.

export const ROLLEN = ["eigenaar", "beheerder", "redacteur"] as const;
export type Rol = (typeof ROLLEN)[number];

export const ROL_LABEL: Record<Rol, string> = {
  eigenaar: "Eigenaar",
  beheerder: "Beheerder",
  redacteur: "Redacteur",
};

export const ROL_UITLEG: Record<Rol, string> = {
  eigenaar: "Mag alles, ook beheerders, instellingen en het logboek.",
  beheerder:
    "Dagelijks werk: bestellingen, klanten, afspraken, advies, website en nieuwsbrief. Geen beheerders, instellingen of logboek; geen bestellingen verwijderen of kortingscodes maken.",
  redacteur: "Alleen inhoud: website (pagina's, blog, teksten, media), nieuwsbrief (zonder contacten) en reviews.",
};

const ALLEN: readonly Rol[] = ROLLEN;
const DAGELIJKS: readonly Rol[] = ["eigenaar", "beheerder"];
const EIGENAAR: readonly Rol[] = ["eigenaar"];

/** Elk recht met een omschrijving en de rollen die het hebben. */
export const RECHTEN = {
  // Overzicht
  overzicht: { label: "Overzicht, zoeken en verbindingsstatus", rollen: DAGELIJKS },
  statistieken: { label: "Statistieken", rollen: DAGELIJKS },
  // Relaties
  adresboek: { label: "Adresboek (incl. export, samenvoegen, AVG-export)", rollen: DAGELIJKS },
  berichten: { label: "Contactberichten", rollen: DAGELIJKS },
  reviews: { label: "Reviews lezen, goedkeuren en bewerken", rollen: ALLEN },
  reviews_uitnodigen: { label: "Reviews: klanten uitnodigen en reviews verwijderen", rollen: DAGELIJKS },
  // Afspraken
  afspraken: { label: "Afspraken en beschikbaarheid", rollen: DAGELIJKS },
  // Verkoop
  bestellingen: { label: "Bestellingen inzien en bijwerken", rollen: DAGELIJKS },
  bestellingen_verwijderen: { label: "Bestellingen verwijderen", rollen: EIGENAAR },
  kortingscodes: { label: "Kortingscodes inzien", rollen: DAGELIJKS },
  kortingscodes_beheren: { label: "Kortingscodes maken, wijzigen en verwijderen", rollen: EIGENAAR },
  cadeaubonnen: { label: "Cadeaubonnen inzien en opnieuw versturen", rollen: DAGELIJKS },
  // Advies
  advies: { label: "Lichaamstypes, adviestypes, beeldbank en meetinstructies", rollen: DAGELIJKS },
  // Website
  paginas: { label: "Pagina's", rollen: ALLEN },
  homepage: { label: "Homepage-indeling", rollen: ALLEN },
  blog: { label: "Blog", rollen: ALLEN },
  ai: { label: "Schrijven met AI", rollen: ALLEN },
  teksten: { label: "Teksten", rollen: ALLEN },
  media: { label: "Media", rollen: ALLEN },
  prullenbak: { label: "Versies en prullenbak", rollen: ALLEN },
  doorverwijzingen: { label: "Doorverwijzingen", rollen: DAGELIJKS },
  website_instellingen: { label: "Website-instellingen", rollen: EIGENAAR },
  // Nieuwsbrief
  nieuwsbrief: { label: "Nieuwsbrief: campagnes, formulieren, automatisch", rollen: ALLEN },
  nieuwsbrief_contacten: { label: "Nieuwsbrief: contacten (incl. import en export)", rollen: DAGELIJKS },
  // Instellingen
  instellingen: { label: "Algemene instellingen", rollen: EIGENAAR },
  beheerders: { label: "Beheerders en rollen", rollen: EIGENAAR },
  meldingen: { label: "Pushmeldingen op je apparaat", rollen: DAGELIJKS },
  logboek: { label: "Logboek", rollen: EIGENAAR },
  fouten: { label: "Foutenlijst", rollen: DAGELIJKS },
  backup: { label: "Back-up downloaden en controleren", rollen: EIGENAAR },
} as const satisfies Record<string, { label: string; rollen: readonly Rol[] }>;

export type Recht = keyof typeof RECHTEN;

export const ALLE_RECHTEN = Object.keys(RECHTEN) as Recht[];

export function isRol(v: unknown): v is Rol {
  return typeof v === "string" && (ROLLEN as readonly string[]).includes(v);
}

export function isRecht(v: unknown): v is Recht {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(RECHTEN, v);
}

/**
 * De rol uit de database. Onbekende of ontbrekende waarden krijgen de minste
 * rechten (redacteur); de kolom is verplicht, dus dat gebeurt alleen bij een fout.
 */
export function leesRol(v: unknown): Rol {
  return isRol(v) ? v : "redacteur";
}

export function heeftRecht(rol: Rol | null | undefined, recht: Recht): boolean {
  if (!rol) return false;
  return (RECHTEN[recht].rollen as readonly Rol[]).includes(rol);
}

export function rechtenVan(rol: Rol): Recht[] {
  return ALLE_RECHTEN.filter((r) => heeftRecht(rol, r));
}

/**
 * Welk recht een beheerpagina vraagt (voor navigatie en de geen-toegang-pagina).
 * De langste prefix wint. null = elke beheerder.
 */
const PAD_RECHTEN: Record<string, Recht | null> = {
  "/admin": "overzicht",
  "/admin/zoeken": "overzicht",
  "/admin/statistieken": "statistieken",
  "/admin/adresboek": "adresboek",
  "/admin/berichten": "berichten",
  "/admin/reviews": "reviews",
  "/admin/afspraken": "afspraken",
  "/admin/bestellingen": "bestellingen",
  "/admin/order": "bestellingen",
  "/admin/kortingscodes": "kortingscodes",
  "/admin/cadeaubonnen": "cadeaubonnen",
  "/admin/lichaamstypes": "advies",
  "/admin/types": "advies",
  "/admin/beeldbank": "advies",
  "/admin/meetinstructies": "advies",
  "/admin/paginas": "paginas",
  "/admin/website": "website_instellingen",
  "/admin/website/homepage": "homepage",
  "/admin/blog": "blog",
  "/admin/blog/ai": "ai",
  "/admin/teksten": "teksten",
  "/admin/media": "media",
  "/admin/doorverwijzingen": "doorverwijzingen",
  "/admin/versies": "prullenbak",
  "/admin/nieuwsbrief": "nieuwsbrief",
  "/admin/nieuwsbrief/contacten": "nieuwsbrief_contacten",
  "/admin/instellingen": "instellingen",
  "/admin/beheerders": "beheerders",
  "/admin/meldingen": "meldingen",
  "/admin/logboek": "logboek",
  "/admin/fouten": "fouten",
  "/admin/backup": "backup",
  "/admin/beveiliging": null,
  "/admin/geen-toegang": null,
};

export function rechtVoorPad(pad: string): Recht | null {
  const schoon = pad.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  let beste: string | null = null;
  for (const p of Object.keys(PAD_RECHTEN)) {
    if ((schoon === p || schoon.startsWith(`${p}/`)) && (!beste || p.length > beste.length)) beste = p;
  }
  return beste === null ? null : PAD_RECHTEN[beste];
}

export function magPad(rol: Rol | null | undefined, pad: string): boolean {
  if (!rol) return false;
  const recht = rechtVoorPad(pad);
  return recht === null || heeftRecht(rol, recht);
}

/** Waar een rol na het inloggen begint (de eerste pagina die hij mag zien). */
export function startPagina(rol: Rol): string {
  for (const pad of ["/admin", "/admin/paginas", "/admin/blog", "/admin/nieuwsbrief", "/admin/reviews"]) {
    if (magPad(rol, pad)) return pad;
  }
  return "/admin/beveiliging";
}

/**
 * Waarom de rol van een beheerder niet gewijzigd mag worden, of null als het mag.
 * Je wijzigt je eigen rol nooit, en de laatste eigenaar blijft eigenaar.
 */
export function rolWijzigBezwaar(opts: {
  mijnId: string;
  doelId: string;
  huidigeRol: Rol;
  nieuweRol: unknown;
  aantalEigenaren: number;
}): string | null {
  if (!isRol(opts.nieuweRol)) return "Kies een geldige rol.";
  if (opts.doelId === opts.mijnId) return "Je kunt je eigen rol niet wijzigen. Laat dat een andere eigenaar doen.";
  if (opts.huidigeRol === opts.nieuweRol) return "Deze beheerder heeft die rol al.";
  if (opts.huidigeRol === "eigenaar" && opts.aantalEigenaren <= 1) {
    return "Dit is de laatste eigenaar; maak eerst iemand anders eigenaar.";
  }
  return null;
}
