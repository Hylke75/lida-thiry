"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maakInlogLink, zoekGebruiker } from "@/lib/beheerders";
import { stuurBeheerderMail } from "@/lib/resend";
import { normaliseerEmail, verwijderBezwaar, wachtwoordBezwaar } from "@/lib/beheerder-regels";

const PAD = "/admin/beheerders";

export interface BeheerUitkomst {
  ok: boolean;
  melding: string;
  /** Link die de beheerder zelf kan doorgeven (als de e-mail niet aankwam of niet verstuurd kon worden). */
  link?: string;
  tijd: number;
}

const uit = (ok: boolean, melding: string, link?: string): BeheerUitkomst => ({ ok, melding, link, tijd: Date.now() });

async function probeerMail(opts: Parameters<typeof stuurBeheerderMail>[0]): Promise<string | null> {
  try {
    await stuurBeheerderMail(opts);
    return null;
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export async function voegBeheerderToe(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  await vereisBeheerder();
  const email = normaliseerEmail(fd.get("email"));
  if (!email) return uit(false, "Vul een geldig e-mailadres in.");
  const db = adminClient();

  let bestaand;
  try {
    bestaand = await zoekGebruiker(email);
  } catch (e) {
    return uit(false, `Opzoeken mislukt: ${e instanceof Error ? e.message : e}`);
  }

  if (bestaand) {
    const { data: al } = await db.from("beheerders").select("gebruiker_id").eq("gebruiker_id", bestaand.id).maybeSingle();
    if (al) return uit(false, `${email} is al beheerder.`);
    const { error } = await db.from("beheerders").insert({ gebruiker_id: bestaand.id, email });
    if (error) return uit(false, `Toevoegen mislukt: ${error.message}`);
    const mailFout = await probeerMail({ aan: email, link: null, nieuw: false });
    revalidatePath(PAD);
    return uit(
      true,
      `${email} had al een account en is nu beheerder. Inloggen gaat met het bestaande wachtwoord.` +
        (mailFout ? ` (Bericht niet verstuurd: ${mailFout})` : " We hebben een bericht gestuurd.") +
        " Geen wachtwoord? Gebruik dan ‘Inloglink sturen’ in de lijst.",
    );
  }

  let link: string;
  try {
    const r = await maakInlogLink(email, "invite");
    link = r.link;
    const { error } = await db.from("beheerders").insert({ gebruiker_id: r.user.id, email });
    if (error) return uit(false, `Account gemaakt, maar toevoegen als beheerder mislukt: ${error.message}`);
  } catch (e) {
    return uit(false, `Uitnodigen mislukt: ${e instanceof Error ? e.message : e}`);
  }
  const mailFout = await probeerMail({ aan: email, link, nieuw: true });
  revalidatePath(PAD);
  return uit(
    true,
    mailFout
      ? `${email} is toegevoegd, maar de uitnodiging kon niet gemaild worden (${mailFout}). Stuur de link hieronder zelf door.`
      : `Uitnodiging gestuurd naar ${email}. Komt de mail niet aan, stuur dan de link hieronder zelf door.`,
    link,
  );
}

export async function stuurInlogLink(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  await vereisBeheerder();
  const id = String(fd.get("gebruiker_id") ?? "");
  const { data: rij } = await adminClient().from("beheerders").select("gebruiker_id").eq("gebruiker_id", id).maybeSingle();
  if (!rij) return uit(false, "Deze beheerder bestaat niet (meer).");
  const { data } = await adminClient().auth.admin.getUserById(id);
  const email = data.user?.email;
  if (!email) return uit(false, "Van deze beheerder is geen e-mailadres bekend.");
  try {
    // Uitnodiging nog niet geaccepteerd: een nieuwe uitnodiging; anders een herstel-link.
    const soort = data.user?.email_confirmed_at ? "recovery" : "invite";
    const { link } = await maakInlogLink(email, soort);
    const mailFout = await probeerMail({ aan: email, link, nieuw: soort === "invite" });
    return mailFout
      ? uit(false, `De mail kon niet verstuurd worden (${mailFout}). Stuur deze link zelf door:`, link)
      : uit(true, `Inloglink gestuurd naar ${email}.`);
  } catch (e) {
    return uit(false, `Link maken mislukt: ${e instanceof Error ? e.message : e}`);
  }
}

export async function verwijderBeheerder(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  const ik = await vereisBeheerder();
  const doelId = String(fd.get("gebruiker_id") ?? "");
  const db = adminClient();
  const { count, error: telFout } = await db.from("beheerders").select("*", { count: "exact", head: true });
  if (telFout) return uit(false, `Mislukt: ${telFout.message}`);
  const bezwaar = verwijderBezwaar({ mijnId: ik.id, doelId, aantalBeheerders: count ?? 0 });
  if (bezwaar) return uit(false, bezwaar);
  // Alleen de beheerdersrol intrekken; het account zelf blijft bestaan.
  const { error } = await db.from("beheerders").delete().eq("gebruiker_id", doelId);
  if (error) return uit(false, `Verwijderen mislukt: ${error.message}`);
  revalidatePath(PAD);
  return uit(true, "Beheerder verwijderd.");
}

export async function wijzigWachtwoord(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  await vereisBeheerder();
  const wachtwoord = fd.get("wachtwoord");
  const bezwaar = wachtwoordBezwaar(wachtwoord, fd.get("herhaling"));
  if (bezwaar) return uit(false, bezwaar);
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: wachtwoord as string });
  if (error) {
    const melding =
      error.code === "same_password"
        ? "Het nieuwe wachtwoord is hetzelfde als het oude. Kies een ander wachtwoord."
        : error.code === "weak_password"
          ? "Dit wachtwoord is te zwak. Kies een langer of minder voorspelbaar wachtwoord."
          : error.code === "reauthentication_needed"
            ? "Log voor de zekerheid opnieuw in en probeer het daarna nog eens."
            : `Wijzigen mislukt: ${error.message}`;
    return uit(false, melding);
  }
  return uit(true, "Je wachtwoord is gewijzigd. Gebruik voortaan het nieuwe wachtwoord om in te loggen.");
}
