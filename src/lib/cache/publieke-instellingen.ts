// Welke instellingen de publieke site gecachet mag lezen. Puur, zodat het te testen is.
//
// Alleen wat bezoekers toch al te zien krijgen (naam, logo, prijs, bedrijfs-
// gegevens in de voorwaarden). Interne instellingen (bijv. het e-mailadres voor
// foutmeldingen, verzendlimieten of rekenregels) komen nooit in de publieke
// cache of in de HTML; die leest de server vers via leesInstellingen().

import { WEBSITE_SLEUTELS } from "../website/instellingen";

export const PUBLIEKE_INSTELLINGEN: readonly string[] = [
  ...WEBSITE_SLEUTELS,
  "homepage_indeling",
  "prijs_cent",
  "valuta",
  "bewaartermijn_maten_dagen",
  "bedrijfsnaam",
  "bedrijf_adres",
  "contact_email",
  "kvk_nummer",
  "btw_nummer",
];

const TOEGESTAAN = new Set(PUBLIEKE_INSTELLINGEN);

/** Houdt alleen de publieke sleutels over. */
export function filterPubliekeInstellingen(
  map: Readonly<Record<string, string | null>>,
): Record<string, string | null> {
  const uit: Record<string, string | null> = {};
  for (const [sleutel, waarde] of Object.entries(map)) if (TOEGESTAAN.has(sleutel)) uit[sleutel] = waarde;
  return uit;
}
