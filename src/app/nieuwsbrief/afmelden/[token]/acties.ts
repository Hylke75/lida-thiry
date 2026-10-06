"use server";

import { redirect } from "next/navigation";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AFMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { meldAf } from "@/lib/nieuwsbrief/contacten";
import { meldOpnieuwAanViaToken } from "@/lib/nieuwsbrief/beheer";
import { TOKEN_PATROON, UUID_PATROON } from "@/lib/nieuwsbrief/links";

// Openbare acties: de persoonlijke, geheime link (token) is het enige bewijs.
// Ze lekken niet of een adres bestaat; de pagina toont daarna de stand van zaken.

function pad(token: string, stap?: string): string {
  return `/nieuwsbrief/afmelden/${token}${stap ? `?stap=${stap}` : ""}`;
}

export async function afmelden(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  if (!TOKEN_PATROON.test(token)) redirect("/");
  const v = String(fd.get("v") ?? "");
  try {
    await meldAf(token, UUID_PATROON.test(v) ? v : null);
  } catch (e) {
    console.error("Afmelden mislukt", e);
    redirect(pad(token, "fout"));
  }
  redirect(pad(token, "afgemeld"));
}

export async function opnieuwAanmelden(fd: FormData): Promise<void> {
  const token = String(fd.get("token") ?? "");
  if (!TOKEN_PATROON.test(token)) redirect("/");
  try {
    const teksten = await leesSectie(NIEUWSBRIEF_AFMELDEN);
    await meldOpnieuwAanViaToken(token, teksten.opnieuw_toestemming);
  } catch (e) {
    console.error("Opnieuw aanmelden mislukt", e);
    redirect(pad(token, "fout"));
  }
  redirect(pad(token, "aangemeld"));
}
