import { after, NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { leesSectie } from "@/lib/inhoud/lees";
import { CONTACT_FORMULIER } from "@/lib/inhoud/groepen/contact";
import { koppelRelatie } from "@/lib/relaties/koppel";
import { siteUrl } from "@/lib/site";
import { stuurBeheerMelding, foutTekst } from "@/lib/beheermelding";
import { BERICHT_VELDEN, stuurContactMails, type ContactBericht } from "@/lib/contact/berichten";
import { paginaUitReferer, spamRedenen, valideerContact } from "@/lib/contact/regels";

export const runtime = "nodejs";

const gelukt = () => NextResponse.json({ ok: true });
const mislukt = () =>
  NextResponse.json({ fout: "Versturen is nu niet gelukt. Probeer het later opnieuw." }, { status: 500 });

/** Hosts die als ‘deze site’ gelden voor de Referer. */
function eigenHosts(request: Request): string[] {
  const hosts = new Set<string>();
  try {
    hosts.add(new URL(request.url).host);
  } catch {}
  try {
    hosts.add(new URL(siteUrl()).host);
  } catch {}
  const host = request.headers.get("host");
  if (host) hosts.add(host);
  return [...hosts];
}

export async function POST(request: Request) {
  if (!(await magDoor(request, "contact", 5, 600))) return teVeelVerzoeken();
  let body: Record<string, unknown>;
  try {
    const ruw: unknown = await request.json();
    if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) throw new Error("geen object");
    body = ruw as Record<string, unknown>;
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  // Honeypot: alleen bots vullen het verborgen veld 'website'. Doe alsof het lukt.
  if (typeof body.website === "string" && body.website.trim() !== "") return gelukt();

  const teksten = await leesSectie(CONTACT_FORMULIER);
  const v = valideerContact(body, teksten.onderwerpen.map((o) => o.onderwerp));
  if (!v.ok) {
    return NextResponse.json({ fout: "Controleer de gemarkeerde velden.", velden: v.fouten }, { status: 400 });
  }
  const invoer = v.waarde;
  const spam = spamRedenen(invoer);
  const pagina = paginaUitReferer(request.headers.get("referer"), eigenHosts(request));

  let bericht: ContactBericht;
  try {
    // Spam niet aan het adresboek koppelen.
    const relatie = spam.length
      ? null
      : await koppelRelatie({ email: invoer.email, naam: invoer.naam, telefoon: invoer.telefoon, bron: "contactformulier" });
    const { data, error } = await adminClient()
      .from("contact_berichten")
      .insert({
        relatie_id: relatie?.id ?? null,
        naam: invoer.naam,
        email: invoer.email,
        telefoon: invoer.telefoon,
        onderwerp: invoer.onderwerp,
        bericht: invoer.bericht,
        status: spam.length ? "spam" : "nieuw",
        pagina,
        notitie: spam.length ? `Automatisch als spam gemarkeerd: ${spam.join("; ")}.` : "",
      })
      .select(BERICHT_VELDEN)
      .single();
    if (error || !data) throw new Error(error?.message ?? "geen rij terug");
    bericht = data as ContactBericht;
  } catch (e) {
    console.error("Contactbericht opslaan mislukt", e);
    await stuurBeheerMelding(
      "Contactbericht niet opgeslagen",
      `Een bericht via het contactformulier kon niet worden opgeslagen.\n\nVan: ${invoer.naam} <${invoer.email}>\nOnderwerp: ${invoer.onderwerp || "-"}\n\n${invoer.bericht}\n\nFout: ${foutTekst(e)}`,
    );
    return mislukt();
  }

  // Spam krijgt geen mails, maar wel hetzelfde antwoord (niets verraden).
  if (!spam.length) {
    // Na het antwoord versturen: de bezoeker hoeft niet op Resend te wachten.
    after(() => stuurContactMails(bericht));
  }
  return gelukt();
}
