import "server-only";
import { leesSectie } from "./inhoud/lees";
import { WEBSITE_KOP } from "./inhoud/groepen/website";
import { leesPubliekeInstellingen } from "./instellingen";
import { leesWebsite } from "./website/lees";
import { MERK_STANDAARD, type Merk } from "./huisstijl";

/**
 * Het woordmerk zoals op de site: de korte naam (Beheer → Website → Instellingen)
 * en de kleine regel eronder (Beheer → Teksten → Kop en voettekst), plus de
 * bedrijfsnaam (Beheer → Instellingen) voor voetteksten van PDF's. Faalt zacht:
 * zonder database gelden de standaardwaarden, zodat mails en PDF's altijd lukken.
 */
export async function leesMerk(): Promise<Merk> {
  try {
    const [site, kop, inst] = await Promise.all([
      leesWebsite(),
      leesSectie(WEBSITE_KOP),
      leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>),
    ]);
    const bedrijfsnaam = inst.bedrijfsnaam?.trim();
    return {
      naam: site.korteNaam.trim() || MERK_STANDAARD.naam,
      subregel: kop.subregel.trim(),
      ...(bedrijfsnaam ? { bedrijfsnaam } : {}),
    };
  } catch (e) {
    console.error("Woordmerk niet geladen; standaard gebruikt.", e);
    return MERK_STANDAARD;
  }
}
