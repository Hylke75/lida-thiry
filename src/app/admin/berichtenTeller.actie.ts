"use server";

import { magBeheerder } from "@/lib/admin-auth";
import { aantalNieuweBerichten } from "@/lib/contact/berichten";

/** Aantal nieuwe contactberichten, voor het rondje in de beheernavigatie. */
export async function telNieuweBerichten(): Promise<number> {
  // Geen doorsturen: dit wordt op de achtergrond opgevraagd. Zonder recht: 0.
  if (!(await magBeheerder("berichten"))) return 0;
  return aantalNieuweBerichten();
}
