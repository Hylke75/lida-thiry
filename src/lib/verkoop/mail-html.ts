// HTML van de mail bij een terugbetaling (met de creditnota als bijlage). Puur,
// zodat de mail zonder Resend of database te testen is. Opmaak: huisstijl van alle
// klantmails (omhulsel uit email-html.ts).

import { escapeHtml } from "../inhoud/opmaak";
import { formatteerBedrag } from "../prijs";
import { omhulsel, type Mail } from "../email-html";
import { KLEIN, kopHtml, type Merk } from "../mail-opmaak";

export function creditnotaMail(
  algemeen: { voettekst: string; merk?: Merk },
  opts: {
    naam: string;
    bedragCent: number;
    valuta: string;
    creditnotanummer: string;
    origineelNummer: string | null;
    viaMollie: boolean;
    reden: string | null;
  },
): Mail {
  const bedrag = formatteerBedrag(opts.bedragCent, opts.valuta);
  const factuur = opts.origineelNummer ? ` (factuur ${escapeHtml(opts.origineelNummer)})` : "";
  const reden = opts.reden?.trim() ? `<p>Reden: ${escapeHtml(opts.reden.trim())}</p>` : "";
  const hoe = opts.viaMollie
    ? "Het bedrag wordt teruggestort op de rekening waarmee je hebt betaald. Afhankelijk van je bank staat het binnen een paar werkdagen op je rekening."
    : "Het bedrag wordt teruggestort op je rekening.";
  const html = omhulsel(
    `
      ${kopHtml(`Terugbetaling van ${bedrag}`)}
      <p>Hoi ${escapeHtml(opts.naam)},</p>
      <p>We hebben ${bedrag} van je betaling${factuur} terugbetaald. ${hoe}</p>
      ${reden}
      <p style="${KLEIN}">In de bijlage vind je creditnota ${escapeHtml(opts.creditnotanummer)} voor je administratie.</p>`,
    algemeen.voettekst,
    algemeen.merk,
  );
  return { onderwerp: `Terugbetaling en creditnota ${opts.creditnotanummer}`, html };
}
