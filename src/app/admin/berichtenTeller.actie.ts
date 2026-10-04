"use server";

import { vereisBeheerder } from "@/lib/admin-auth";
import { aantalNieuweBerichten } from "@/lib/contact/berichten";

/** Aantal nieuwe contactberichten, voor het rondje in de beheernavigatie. */
export async function telNieuweBerichten(): Promise<number> {
  await vereisBeheerder();
  return aantalNieuweBerichten();
}
