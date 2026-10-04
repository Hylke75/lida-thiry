import type { Metadata } from "next";
import { after } from "next/server";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_BEVESTIGD } from "@/lib/inhoud/groepen/nieuwsbrief";
import { bevestig } from "@/lib/nieuwsbrief/contacten";
import { TOKEN_PATROON } from "@/lib/nieuwsbrief/links";
import { planAutomatiseringen, verwerkWachtrij } from "@/lib/nieuwsbrief/verzenden";
import { Kader } from "../../Kader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Aanmelding bevestigen",
  robots: { index: false, follow: false },
};

/** Alleen bij een verse bevestiging de wachtrij aanzwengelen (niet bij elke herhaalde klik). */
const VERS_MS = 5 * 60 * 1000;

function isVers(iso: string | null): boolean {
  return iso !== null && Date.now() - new Date(iso).getTime() < VERS_MS;
}

// Bevestigen via een GET-link is gebruikelijk bij dubbele opt-in. Ook als een
// virusscanner de link opent, is dat onschuldig: bevestig() is idempotent.
export default async function BevestigPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const teksten = await leesSectie(NIEUWSBRIEF_BEVESTIGD);
  const contact = TOKEN_PATROON.test(token) ? await bevestig(token).catch(() => null) : null;

  if (!contact || contact.status !== "aangemeld") {
    return <Kader titel={teksten.ongeldig_titel} tekst={teksten.ongeldig_tekst} />;
  }

  if (isVers(contact.bevestigd_op)) {
    // Na het versturen van de pagina: een eventuele welkomstmail meteen inplannen en versturen.
    after(async () => {
      try {
        await planAutomatiseringen();
        await verwerkWachtrij({ max: 20 });
      } catch (e) {
        console.error("Wachtrij na bevestiging mislukt", e);
      }
    });
  }

  return <Kader titel={teksten.titel} tekst={teksten.tekst} />;
}
