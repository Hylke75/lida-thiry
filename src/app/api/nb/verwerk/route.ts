import { NextResponse } from "next/server";
import { verwerkWachtrij } from "@/lib/nieuwsbrief/verzenden";
import { ruimOnbevestigdeOp } from "@/lib/nieuwsbrief/contacten";
import { stuurBeheerMelding, foutTekst } from "@/lib/beheermelding";
import { isGeldigeCron } from "@/lib/cron-auth";
import { registreerFout } from "@/lib/fouten/registreer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Dagelijkse verzendronde voor de nieuwsbrief (Vercel-cron, zie vercel.json):
// start ingeplande campagnes, plant automatische mails in en verstuurt de wachtrij
// binnen de daglimiet. Daarnaast verwerkt het beheer de wachtrij als het overzicht
// wordt geopend en direct na "Nu verzenden" (het Hobby-abonnement staat maar één
// cron-run per dag toe). Beveiligd met CRON_SECRET (Authorization: Bearer ...).
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) {
    return NextResponse.json({ fout: "CRON_SECRET niet ingesteld." }, { status: 503 });
  }
  if (!isGeldigeCron(request, geheim)) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }

  // Nooit bevestigde aanmeldingen ouder dan 30 dagen opruimen (AVG). Los van het
  // verzenden: een fout hier mag de verzendronde niet tegenhouden.
  let opgeruimd = 0;
  try {
    opgeruimd = await ruimOnbevestigdeOp();
  } catch (e) {
    console.error("Onbevestigde aanmeldingen opruimen mislukt", e);
    await registreerFout({ bron: "cron", fout: e, pad: "/api/nb/verwerk", details: { onderdeel: "onbevestigde aanmeldingen opruimen" } });
  }

  try {
    const uit = await verwerkWachtrij({ max: 1000 });
    if (uit.mislukt > 0) {
      await stuurBeheerMelding(
        "Nieuwsbrief: verzenden deels mislukt",
        `${uit.mislukt} nieuwsbriefmail(s) konden niet worden verstuurd (${uit.verzonden} wel). ` +
          "Bekijk de foutmelding bij de campagne in het beheer (Nieuwsbrief → Campagnes); " +
          "daar kun je de mislukte mails opnieuw in de wachtrij zetten.",
      );
    }
    return NextResponse.json({ ok: true, ...uit, onbevestigdOpgeruimd: opgeruimd });
  } catch (e) {
    console.error("Nieuwsbrief-wachtrij verwerken mislukt", e);
    await stuurBeheerMelding("Nieuwsbrief: verzendronde mislukt", foutTekst(e));
    return NextResponse.json({ fout: foutTekst(e) }, { status: 500 });
  }
}
