// De huisstijl (docs/ontwerp/HUISSTIJL-HANDBOEK.md) voor alles wat buiten de
// website naar de klant gaat: de PDF's, de e-mails en de deelafbeelding. Puur
// (geen server-only), zodat tests en scripts het ook kunnen gebruiken. Op de
// website zelf staan dezelfde kleuren als CSS-variabelen in globals.css.

export const KLEUR = {
  /** Donker aubergine: standaard tekstkleur. */
  ink: "#2F2441",
  inkZacht: "#5D536A",
  /** Primaire actiekleur (knoppen). */
  berry: "#6F2D59",
  cream: "#FFF9F3",
  paper: "#FFFDF9",
  wit: "#FFFFFF",
  /** Alleen voor accenten; als tekst `coralTekst` (en alleen groot). */
  coral: "#FF8877",
  coralTekst: "#DC5A48",
  coralZacht: "#FFE0DA",
  peach: "#FFD2AD",
  butter: "#F6D879",
  sage: "#B8D3AE",
  mint: "#B9DFD9",
  sky: "#B9D9EF",
  lilac: "#D8A7C6",
  lijn: "#EADFD6",
} as const;

/** De kleurstrook: vijf even brede banen (handboek §4: als smalle strip). */
export const STROOK = [KLEUR.coral, KLEUR.butter, KLEUR.sage, KLEUR.sky, KLEUR.lilac] as const;

/** Het typografische woordmerk: de naam in kapitalen met een kleine regel eronder. */
export interface Merk {
  naam: string;
  subregel: string;
  /** Bedrijfsnaam (Beheer → Instellingen) voor voetteksten en documentgegevens; leeg = de standaard. */
  bedrijfsnaam?: string;
}

/** Zoals op de website zolang er niets anders is ingesteld (Beheer → Teksten → Kop en voettekst). */
export const MERK_STANDAARD: Merk = { naam: "Lida Thiry", subregel: "Kleur- en stijladvies" };
