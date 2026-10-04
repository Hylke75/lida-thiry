import { NextResponse, after } from "next/server";
import { magDoor, magDoorOpSleutel, hashIp, teVeelVerzoeken } from "@/lib/rate-limit";
import { geldigEmail } from "@/lib/cadeaubon/regels";
import { stuurMijnAdvies } from "@/lib/mijn-advies";

export const runtime = "nodejs";
export const maxDuration = 60;

// "Mijn advies opnieuw ontvangen". Het antwoord is altijd hetzelfde (ook voor een
// onbekend adres) en het zoeken en mailen gebeurt pas na het antwoord, zodat
// noch de tekst noch de responstijd verraadt of iemand klant is.
export async function POST(request: Request) {
  if (!(await magDoor(request, "mijn-advies", 10, 3600))) return teVeelVerzoeken();
  let body: { email?: unknown; website?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!geldigEmail(email)) {
    return NextResponse.json({ fout: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  // Honeypot: bots krijgen hetzelfde neutrale antwoord.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  after(async () => {
    try {
      // Per e-mailadres maximaal 3 mails per uur; daarboven stil overslaan.
      if (!(await magDoorOpSleutel(`mijn-advies-email:${hashIp(email)}`, 3, 3600))) return;
      await stuurMijnAdvies(email);
    } catch (e) {
      console.error("Mijn advies versturen mislukt", e);
    }
  });
  return NextResponse.json({ ok: true });
}
