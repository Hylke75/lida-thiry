import "server-only";
import { leesInstelling } from "./instellingen";
import { stuurBeheerMail } from "./resend";
import { registreerFout } from "./fouten/registreer";

/** Zet een fout (of willekeurige waarde) om in leesbare tekst voor een melding. */
export function foutTekst(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return typeof e === "string" ? e : JSON.stringify(e);
  } catch {
    return String(e);
  }
}

/**
 * Mailt een foutmelding naar de beheerder: het adres uit de instelling
 * 'adviseur_email', anders env BEHEER_EMAIL. Doet niets als geen van beide is
 * ingesteld. Gooit NOOIT: alarmering mag de eigenlijke verwerking niet breken.
 *
 * Elke melding komt ook in de foutlog (bron 'melding'), zodat alle problemen op
 * één plek staan (Beheer → Instellingen → Fouten). `registreren: false` slaat dat
 * over (gebruikt door de foutlog zelf, die al geregistreerd heeft).
 */
export async function stuurBeheerMelding(
  onderwerp: string,
  details: string,
  opties: { registreren?: boolean } = {},
): Promise<void> {
  if (opties.registreren !== false) {
    await registreerFout({ bron: "melding", fout: onderwerp, details: { melding: details.slice(0, 2000) } });
  }
  try {
    let aan: string | null = null;
    try {
      aan = (await leesInstelling("adviseur_email"))?.trim() || null;
    } catch {
      aan = null;
    }
    aan = aan || process.env.BEHEER_EMAIL?.trim() || null;
    if (!aan) return;
    await stuurBeheerMail({ aan, onderwerp, details });
  } catch (e) {
    console.error("Beheermelding versturen mislukt", onderwerp, e);
    await registreerFout({
      bron: "melding",
      fout: e,
      details: { onderwerp, toelichting: "De beheermelding hierboven kon niet worden gemaild." },
    });
  }
}
