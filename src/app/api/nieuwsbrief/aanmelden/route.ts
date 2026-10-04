import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { meldAan, normaliseerEmail } from "@/lib/nieuwsbrief/contacten";
import { bevestigPagina } from "@/lib/nieuwsbrief/links";
import { stuurNieuwsbriefBevestiging } from "@/lib/resend";

export const runtime = "nodejs";

/** Een onbevestigde aanmelding krijgt binnen dit venster geen tweede bevestigingsmail. */
const OPNIEUW_MAILEN_NA_MS = 10 * 60 * 1000;

// Altijd hetzelfde antwoord, of het adres nu nieuw is, al aangemeld of geblokkeerd:
// zo is via dit formulier niet na te gaan wie op de lijst staat.
const gelukt = () => NextResponse.json({ ok: true });

export async function POST(request: Request) {
  if (!(await magDoor(request, "nieuwsbrief", 5, 600))) return teVeelVerzoeken();
  let body: { email?: unknown; naam?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  // Honeypot: alleen bots vullen het verborgen veld 'website'. Doe alsof het lukt.
  if (typeof body.website === "string" && body.website.trim() !== "") return gelukt();

  const email = normaliseerEmail(typeof body.email === "string" ? body.email : "");
  if (!email) return NextResponse.json({ fout: "Vul een geldig e-mailadres in." }, { status: 400 });
  const naam = typeof body.naam === "string" ? body.naam.trim().slice(0, 120) : "";

  try {
    // Niet steeds opnieuw mailen naar iemand die net een bevestigingsmail kreeg.
    const { data: bestaand } = await adminClient()
      .from("nb_contacten")
      .select("status, toestemming_op")
      .eq("email", email)
      .maybeSingle();
    if (
      bestaand?.status === "onbevestigd" &&
      bestaand.toestemming_op &&
      Date.now() - new Date(bestaand.toestemming_op).getTime() < OPNIEUW_MAILEN_NA_MS
    ) {
      return gelukt();
    }

    const teksten = await leesSectie(NIEUWSBRIEF_AANMELDEN);
    const uitkomst = await meldAan({
      email,
      naam: naam || null,
      bron: "formulier",
      dubbeleOptIn: true,
      toestemmingTekst: teksten.toestemming_tekst,
    });
    if (uitkomst.soort === "bevestigen") {
      await stuurNieuwsbriefBevestiging({
        email: uitkomst.contact.email,
        naam: uitkomst.contact.naam,
        link: bevestigPagina(uitkomst.contact.token),
      });
    }
  } catch (e) {
    console.error("Nieuwsbriefaanmelding mislukt", e);
    return NextResponse.json({ fout: "Aanmelden is nu niet gelukt. Probeer het later opnieuw." }, { status: 500 });
  }
  return gelukt();
}
