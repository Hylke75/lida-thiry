import { NextResponse, after } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { meldAan, normaliseerEmail } from "@/lib/nieuwsbrief/contacten";
import { bevestigPagina } from "@/lib/nieuwsbrief/links";
import { haalActiefFormulier } from "@/lib/nieuwsbrief/formulieren";
import { aanmeldOpties, leesFormulierSlug } from "@/lib/nieuwsbrief/formulierregels";
import { planAutomatiseringen, verwerkWachtrij } from "@/lib/nieuwsbrief/verzenden";
import { stuurNieuwsbriefBevestiging } from "@/lib/resend";

export const runtime = "nodejs";

/** Een onbevestigde aanmelding krijgt binnen dit venster geen tweede bevestigingsmail. */
const OPNIEUW_MAILEN_NA_MS = 10 * 60 * 1000;

// Altijd hetzelfde antwoord, of het adres nu nieuw is, al aangemeld of geblokkeerd:
// zo is via dit formulier niet na te gaan wie op de lijst staat.
const gelukt = () => NextResponse.json({ ok: true });
const onbekendFormulier = () =>
  NextResponse.json({ fout: "Dit aanmeldformulier bestaat niet (meer). Vernieuw de pagina en probeer het opnieuw." }, { status: 404 });

export async function POST(request: Request) {
  if (!(await magDoor(request, "nieuwsbrief", 5, 600))) return teVeelVerzoeken();
  let body: { email?: unknown; naam?: unknown; website?: unknown; formulier?: unknown };
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
  // Optioneel: een aanmeldformulier uit Beheer → Nieuwsbrief → Formulieren.
  const slug = leesFormulierSlug(body.formulier);
  if (slug === null) return onbekendFormulier();

  try {
    const formulier = slug ? await haalActiefFormulier(slug) : null;
    if (slug && !formulier) return onbekendFormulier();
    const teksten = await leesSectie(NIEUWSBRIEF_AANMELDEN);
    const keuze = aanmeldOpties(formulier, naam, teksten.toestemming_tekst);
    if (!keuze.ok) return NextResponse.json({ fout: keuze.fout }, { status: 400 });
    const opties = keuze.opties;

    // Niet steeds opnieuw mailen naar iemand die net een bevestigingsmail kreeg.
    const { data: bestaand } = await adminClient()
      .from("nb_contacten")
      .select("status, toestemming_op")
      .eq("email", email)
      .maybeSingle();
    if (
      opties.dubbeleOptIn &&
      bestaand?.status === "onbevestigd" &&
      bestaand.toestemming_op &&
      Date.now() - new Date(bestaand.toestemming_op).getTime() < OPNIEUW_MAILEN_NA_MS
    ) {
      return gelukt();
    }

    const uitkomst = await meldAan({
      email,
      naam: opties.naam,
      bron: "formulier",
      dubbeleOptIn: opties.dubbeleOptIn,
      toestemmingTekst: opties.toestemmingTekst,
      tags: opties.tags,
      formulierId: opties.formulierId,
    });
    if (uitkomst.soort === "bevestigen") {
      await stuurNieuwsbriefBevestiging({
        email: uitkomst.contact.email,
        naam: uitkomst.contact.naam,
        link: bevestigPagina(uitkomst.contact.token),
      });
    } else if (uitkomst.soort === "aangemeld") {
      // Formulier zonder dubbele opt-in: meteen aangemeld, dus een eventuele
      // welkomstmail nu inplannen (net als na het bevestigen).
      after(async () => {
        try {
          await planAutomatiseringen();
          await verwerkWachtrij({ max: 20 });
        } catch (e) {
          console.error("Wachtrij na aanmelding mislukt", e);
        }
      });
    }
  } catch (e) {
    console.error("Nieuwsbriefaanmelding mislukt", e);
    return NextResponse.json({ fout: "Aanmelden is nu niet gelukt. Probeer het later opnieuw." }, { status: 500 });
  }
  return gelukt();
}
