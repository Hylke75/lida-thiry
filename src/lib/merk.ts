import "server-only";
import { leesSectie } from "./inhoud/lees";
import { WEBSITE_KOP } from "./inhoud/groepen/website";
import { leesWebsite } from "./website/lees";
import { MERK_STANDAARD, type Merk } from "./huisstijl";

/**
 * Het woordmerk zoals op de site: de korte naam (Beheer → Website → Instellingen)
 * en de kleine regel eronder (Beheer → Teksten → Kop en voettekst). Faalt zacht:
 * zonder database gelden de standaardwaarden, zodat mails en PDF's altijd lukken.
 */
export async function leesMerk(): Promise<Merk> {
  try {
    const [site, kop] = await Promise.all([leesWebsite(), leesSectie(WEBSITE_KOP)]);
    return { naam: site.korteNaam.trim() || MERK_STANDAARD.naam, subregel: kop.subregel.trim() };
  } catch (e) {
    console.error("Woordmerk niet geladen; standaard gebruikt.", e);
    return MERK_STANDAARD;
  }
}
