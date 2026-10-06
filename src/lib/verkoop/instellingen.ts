import "server-only";
import { leesInstellingen } from "../instellingen";
import { leesCadeaubonInstellingen, type CadeaubonInstellingen } from "../cadeaubon/regels";
import {
  betaalOmschrijving,
  leesBtwProcent,
  leesProductNaam,
  leesVerkoopTijden,
  type VerkoopTijden,
} from "./regels";

export interface VerkoopInstellingen {
  btwProcent: number;
  productNaam: string;
  /** Omschrijving van de Mollie-betaling voor de test of een cadeaubon. */
  betaalOmschrijving: (soort?: "test" | "cadeaubon") => string;
  tijden: VerkoopTijden;
  cadeaubon: CadeaubonInstellingen;
}

/** Leest de verkoopinstellingen (vers uit de database; ongeldige waarden = standaard). */
export async function leesVerkoopInstellingen(): Promise<VerkoopInstellingen> {
  const inst = await leesInstellingen();
  return {
    btwProcent: leesBtwProcent(inst.btw_procent),
    productNaam: leesProductNaam(inst.product_naam),
    betaalOmschrijving: (soort = "test") => betaalOmschrijving(inst.betaling_omschrijving, soort),
    tijden: leesVerkoopTijden(inst),
    cadeaubon: leesCadeaubonInstellingen(inst),
  };
}
