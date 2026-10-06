import { describe, expect, it } from "vitest";
import { standaardWaarden } from "../inhoud/schema";
import { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import {
  AFSPRAKEN_AANVRAAGMAIL,
  AFSPRAKEN_ANNULEERMAIL,
  AFSPRAKEN_BEVESTIGMAIL,
  AFSPRAKEN_HERINNERINGMAIL,
} from "../inhoud/groepen/afspraken";
import {
  afspraakAanvraagMail,
  afspraakAnnuleringMail,
  afspraakBevestigingMail,
  afspraakHerinneringMail,
  afspraakMeldingMail,
  mailWaarden,
  type MailAfspraak,
} from "../afspraken/mail-html";

const algemeen = standaardWaarden(EMAILS_ALGEMEEN);
const a: MailAfspraak = {
  naam: "Anna <b>de Vries</b>",
  email: "anna@voorbeeld.nl",
  telefoon: "0612345678",
  opmerking: "Graag <script>",
  soort: "Kleuradvies",
  start: "2026-10-05T07:00:00Z",
  eind: "2026-10-05T08:30:00Z",
  locatie: "Dorpsstraat 1, Ergens",
  online: false,
  aanbetalingCent: 2500,
  betaald: true,
};
const LINK = "https://lidathiry.nl/afspraak/abc";

describe("afspraken/mail-html", () => {
  it("vult de variabelen in Nederlandse tijd in", () => {
    expect(mailWaarden(a)).toEqual({
      naam: a.naam,
      soort: "Kleuradvies",
      datum: "maandag 5 oktober 2026",
      tijd: "09:00",
      eindtijd: "10:30",
      locatie: "Dorpsstraat 1, Ergens",
    });
    expect(mailWaarden({ ...a, locatie: "", online: true }).locatie).toBe("online");
  });

  it("bevestiging: onderwerp, details, knop en geen onveilige HTML", () => {
    const m = afspraakBevestigingMail(standaardWaarden(AFSPRAKEN_BEVESTIGMAIL), algemeen, a, LINK);
    expect(m.onderwerp).toBe("Je afspraak op maandag 5 oktober 2026 om 09:00 is bevestigd");
    expect(m.html).toContain("Kleuradvies");
    expect(m.html).toContain("09:00 – 10:30 (1 uur en 30 minuten)");
    expect(m.html).toContain("Dorpsstraat 1, Ergens");
    expect(m.html).toMatch(/€\s?25,00 \(betaald\)/);
    expect(m.html).toContain(`href="${LINK}"`);
    expect(m.html).not.toContain("<b>de Vries");
    expect(m.html).toContain("Anna &lt;b&gt;de Vries&lt;/b&gt;");
    expect(m.tekst).toContain(`Bekijk of annuleer je afspraak: ${LINK}`);
    expect(m.tekst).toContain("Datum: maandag 5 oktober 2026");
    expect(m.tekst).not.toMatch(/\n\n\n/);
  });

  it("aanvraag en herinnering gebruiken hun eigen teksten", () => {
    expect(afspraakAanvraagMail(standaardWaarden(AFSPRAKEN_AANVRAAGMAIL), algemeen, a, LINK).onderwerp).toBe(
      "Je aanvraag voor maandag 5 oktober 2026 om 09:00",
    );
    expect(afspraakHerinneringMail(standaardWaarden(AFSPRAKEN_HERINNERINGMAIL), algemeen, a, LINK).onderwerp).toBe(
      "Herinnering: morgen om 09:00 je afspraak",
    );
  });

  it("annulering met en zonder toelichting", () => {
    const t = standaardWaarden(AFSPRAKEN_ANNULEERMAIL);
    const met = afspraakAnnuleringMail(t, algemeen, a, "https://lidathiry.nl/afspraak", "Ik ben <ziek>");
    expect(met.onderwerp).toBe("Je afspraak op maandag 5 oktober 2026 is geannuleerd");
    expect(met.html).toContain("Toelichting:");
    expect(met.html).toContain("Ik ben &lt;ziek&gt;");
    expect(met.tekst).toContain("Toelichting:\nIk ben <ziek>");
    const zonder = afspraakAnnuleringMail(t, algemeen, a, "https://lidathiry.nl/afspraak", "  ");
    expect(zonder.html).not.toContain("Toelichting:");
  });

  it("melding aan de beheerder", () => {
    const m = afspraakMeldingMail({ soort: "nieuw", afspraak: a, status: "bevestigd", link: "https://x/admin/afspraken/1" });
    expect(m.onderwerp).toBe("Nieuwe afspraak: Anna <b>de Vries</b>, maandag 5 oktober 2026 09:00");
    expect(m.html).toContain("Graag &lt;script&gt;");
    expect(m.html).not.toContain("<script>");
    expect(m.tekst).toContain("Status: Bevestigd");
    const aanvraag = afspraakMeldingMail({ soort: "nieuw", afspraak: a, status: "aangevraagd", link: "x" });
    expect(aanvraag.onderwerp).toMatch(/^Nieuwe aanvraag/);
    const geannuleerd = afspraakMeldingMail({ soort: "geannuleerd", afspraak: a, status: "geannuleerd", link: "x" });
    expect(geannuleerd.tekst).toContain("aanbetaling");
  });
});
