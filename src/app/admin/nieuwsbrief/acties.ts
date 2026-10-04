"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { verwerkWachtrij, type WachtrijResultaat } from "@/lib/nieuwsbrief/verzenden";
import { foutTekst } from "@/lib/beheermelding";
import type { Uitkomst } from "../types/uitkomst";

function beschrijf(r: WachtrijResultaat): string {
  if (!r.verzonden && !r.mislukt && !r.overgeslagen) {
    return r.limietBereikt
      ? "De daglimiet is bereikt; de wachtrij gaat verder zodra er weer ruimte is."
      : "Niets te verzenden: de wachtrij is leeg.";
  }
  const delen = [`${r.verzonden} verzonden`];
  if (r.mislukt) delen.push(`${r.mislukt} mislukt`);
  if (r.overgeslagen) delen.push(`${r.overgeslagen} overgeslagen (inmiddels afgemeld)`);
  let tekst = `${delen.join(", ")}.`;
  if (r.limietBereikt) tekst += " De daglimiet is bereikt; de rest gaat bij een volgende ronde.";
  return tekst;
}

/** "Wachtrij nu verwerken" op het nieuwsbriefoverzicht. */
export async function verwerkWachtrijNu(): Promise<Uitkomst> {
  await vereisBeheerder();
  try {
    const r = await verwerkWachtrij({ max: 300 });
    revalidatePath("/admin/nieuwsbrief");
    return { ok: r.mislukt === 0, melding: beschrijf(r), tijd: Date.now() };
  } catch (e) {
    return { ok: false, melding: `Verwerken mislukt: ${foutTekst(e)}`, tijd: Date.now() };
  }
}
