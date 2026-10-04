import { after, NextResponse } from "next/server";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { leesSectie } from "@/lib/inhoud/lees";
import { AFSPRAKEN_BOEKEN } from "@/lib/inhoud/groepen/afspraken";
import { foutTekst, stuurBeheerMelding } from "@/lib/beheermelding";
import { boekAfspraak } from "@/lib/afspraken/data";
import { naNieuweAfspraak } from "@/lib/afspraken/mails";
import { valideerBoeking } from "@/lib/afspraken/regels";

export const runtime = "nodejs";

// Een afspraak boeken vanaf /afspraak of het blok {afspraak}. Rate limit en
// honeypot tegen misbruik; de tijd wordt vlak voor het opslaan opnieuw
// gecontroleerd (zie boekAfspraak). Met aanbetaling volgt een Mollie-betaling.
export async function POST(request: Request) {
  if (!(await magDoor(request, "afspraak", 5, 600))) return teVeelVerzoeken();
  let body: Record<string, unknown>;
  try {
    const ruw: unknown = await request.json();
    if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) throw new Error("geen object");
    body = ruw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  // Honeypot: alleen bots vullen het verborgen veld 'website'. Doe alsof het lukt.
  if (typeof body.website === "string" && body.website.trim() !== "") return NextResponse.json({ ok: true, status: "bevestigd" });

  const v = valideerBoeking(body);
  if (!v.ok) return NextResponse.json({ fout: "Controleer de gemarkeerde velden.", velden: v.fouten }, { status: 400 });

  const teksten = await leesSectie(AFSPRAKEN_BOEKEN);
  try {
    const r = await boekAfspraak(v.waarde);
    if (!r.ok) {
      if (r.reden === "bezet") return NextResponse.json({ fout: teksten.bezet, bezet: true }, { status: 409 });
      if (r.reden === "soort") return NextResponse.json({ fout: "Deze soort afspraak kan niet (meer) worden geboekt." }, { status: 400 });
      return NextResponse.json({ fout: teksten.fout }, { status: 502 });
    }
    if (r.checkoutUrl) return NextResponse.json({ ok: true, status: r.afspraak.status, checkoutUrl: r.checkoutUrl });
    const afspraak = r.afspraak;
    // Na het antwoord mailen: de bezoeker hoeft niet op Resend te wachten.
    after(() => naNieuweAfspraak(afspraak));
    return NextResponse.json({ ok: true, status: afspraak.status, token: afspraak.token });
  } catch (e) {
    console.error("Afspraak boeken mislukt", e);
    await stuurBeheerMelding(
      "Afspraak boeken mislukt",
      `Een bezoeker kon geen afspraak maken.\n\nVan: ${v.waarde.naam} <${v.waarde.email}>\nTijd: ${v.waarde.start}\n\nFout: ${foutTekst(e)}`,
    );
    return NextResponse.json({ fout: teksten.fout }, { status: 500 });
  }
}
