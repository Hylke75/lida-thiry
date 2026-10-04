"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maakInlogLink, telBeheerders, zoekGebruiker } from "@/lib/beheerders";
import { logActie } from "@/lib/beheer-log";
import { isRol, ROL_LABEL, rolWijzigBezwaar, type Rol } from "@/lib/rollen";
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

/** Voegt een beheerdersrij toe, met rol (valt terug op zonder rol bij een oude database). */
async function voegRijToe(gebruikerId: string, email: string, rol: Rol): Promise<string | null> {
  const db = adminClient();
  const { error } = await db.from("beheerders").insert({ gebruiker_id: gebruikerId, email, rol });
  if (!error) return null;
  if (/column .*rol/i.test(error.message)) {
    const oud = await db.from("beheerders").insert({ gebruiker_id: gebruikerId, email });
    return oud.error?.message ?? null;
  }
  return error.message;
}

export async function voegBeheerderToe(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  const ik = await vereisBeheerder("beheerders");
  const email = normaliseerEmail(fd.get("email"));
  if (!email) return uit(false, "Vul een geldig e-mailadres in.");
  const ruweRol = fd.get("rol") ?? "beheerder";
  if (!isRol(ruweRol)) return uit(false, "Kies een geldige rol.");
  const rol: Rol = ruweRol;
  const db = adminClient();
  const log = (nieuw: boolean, gebruikerId: string) =>
    logActie({
      actie: "beheerder.uitnodigen",
      onderwerpSoort: "beheerder",
      onderwerpId: gebruikerId,
      omschrijving: `${email} toegevoegd als ${ROL_LABEL[rol].toLowerCase()}${nieuw ? " (uitgenodigd)" : " (bestaand account)"}`,
      details: { email, rol, nieuw_account: nieuw },
      gebruiker: ik,
    });

  let bestaand;
  try {
    bestaand = await zoekGebruiker(email);
  } catch (e) {
    return uit(false, `Opzoeken mislukt: ${e instanceof Error ? e.message : e}`);
  }

  if (bestaand) {
    const { data: al } = await db.from("beheerders").select("gebruiker_id").eq("gebruiker_id", bestaand.id).maybeSingle();
    if (al) return uit(false, `${email} is al beheerder.`);
    const fout = await voegRijToe(bestaand.id, email, rol);
    if (fout) return uit(false, `Toevoegen mislukt: ${fout}`);
    await log(false, bestaand.id);
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
    const fout = await voegRijToe(r.user.id, email, rol);
    if (fout) return uit(false, `Account gemaakt, maar toevoegen als beheerder mislukt: ${fout}`);
    await log(true, r.user.id);
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
  const ik = await vereisBeheerder("beheerders");
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
    await logActie({
      actie: "beheerder.inloglink",
      onderwerpSoort: "beheerder",
      onderwerpId: id,
      omschrijving: `Inloglink (${soort === "invite" ? "uitnodiging" : "herstel"}) gemaakt voor ${email}${mailFout ? "; mail niet verstuurd" : ""}`,
      gebruiker: ik,
    });
    return mailFout
      ? uit(false, `De mail kon niet verstuurd worden (${mailFout}). Stuur deze link zelf door:`, link)
      : uit(true, `Inloglink gestuurd naar ${email}.`);
  } catch (e) {
    return uit(false, `Link maken mislukt: ${e instanceof Error ? e.message : e}`);
  }
}

export async function verwijderBeheerder(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  const ik = await vereisBeheerder("beheerders");
  const doelId = String(fd.get("gebruiker_id") ?? "");
  const db = adminClient();
  let telling;
  try {
    telling = await telBeheerders();
  } catch (e) {
    return uit(false, `Mislukt: ${e instanceof Error ? e.message : e}`);
  }
  const doelRol = telling.rollen.get(doelId);
  if (!doelRol) return uit(false, "Deze beheerder bestaat niet (meer).");
  const bezwaar = verwijderBezwaar({
    mijnId: ik.id,
    doelId,
    aantalBeheerders: telling.beheerders,
    doelIsEigenaar: doelRol === "eigenaar",
    aantalEigenaren: telling.eigenaren,
  });
  if (bezwaar) return uit(false, bezwaar);
  // Alleen de beheerdersrol intrekken; het account zelf blijft bestaan.
  const { data: weg, error } = await db.from("beheerders").delete().eq("gebruiker_id", doelId).select("email").maybeSingle();
  if (error) return uit(false, `Verwijderen mislukt: ${error.message}`);
  await logActie({
    actie: "beheerder.verwijderen",
    onderwerpSoort: "beheerder",
    onderwerpId: doelId,
    omschrijving: `${(weg as { email?: string | null } | null)?.email ?? doelId} verwijderd als ${ROL_LABEL[doelRol].toLowerCase()}`,
    details: { rol: doelRol },
    gebruiker: ik,
  });
  revalidatePath(PAD);
  return uit(true, "Beheerder verwijderd.");
}

export async function wijzigRol(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  const ik = await vereisBeheerder("beheerders");
  const doelId = String(fd.get("gebruiker_id") ?? "");
  const nieuweRol = fd.get("rol");
  let telling;
  try {
    telling = await telBeheerders();
  } catch (e) {
    return uit(false, `Mislukt: ${e instanceof Error ? e.message : e}`);
  }
  const huidigeRol = telling.rollen.get(doelId);
  if (!huidigeRol) return uit(false, "Deze beheerder bestaat niet (meer).");
  const bezwaar = rolWijzigBezwaar({ mijnId: ik.id, doelId, huidigeRol, nieuweRol, aantalEigenaren: telling.eigenaren });
  if (bezwaar || !isRol(nieuweRol)) return uit(false, bezwaar ?? "Kies een geldige rol.");
  const { data: rij, error } = await adminClient()
    .from("beheerders")
    .update({ rol: nieuweRol })
    .eq("gebruiker_id", doelId)
    .select("email")
    .maybeSingle();
  if (error) return uit(false, `Wijzigen mislukt: ${error.message}`);
  const email = (rij as { email?: string | null } | null)?.email ?? doelId;
  await logActie({
    actie: "beheerder.rol_wijzigen",
    onderwerpSoort: "beheerder",
    onderwerpId: doelId,
    omschrijving: `Rol van ${email}: ${ROL_LABEL[huidigeRol]} → ${ROL_LABEL[nieuweRol]}`,
    details: { van: huidigeRol, naar: nieuweRol },
    gebruiker: ik,
  });
  revalidatePath(PAD);
  return uit(true, `${email} is nu ${ROL_LABEL[nieuweRol].toLowerCase()}.`);
}

/**
 * Haalt de tweestapsverificatie van een andere beheerder weg (bijv. bij een
 * kwijtgeraakte telefoon). Daarna logt die weer in met alleen het wachtwoord en
 * kan een nieuwe app koppelen.
 */
export async function resetTweestap(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  const ik = await vereisBeheerder("beheerders");
  const doelId = String(fd.get("gebruiker_id") ?? "");
  if (doelId === ik.id) return uit(false, "Je eigen tweestapsverificatie beheer je onder Instellingen → Beveiliging.");
  const db = adminClient();
  const { data: rij } = await db.from("beheerders").select("email").eq("gebruiker_id", doelId).maybeSingle();
  if (!rij) return uit(false, "Deze beheerder bestaat niet (meer).");
  const { data, error } = await db.auth.admin.mfa.listFactors({ userId: doelId });
  if (error) return uit(false, `Opvragen mislukt: ${error.message}`);
  const factoren = (data?.factors ?? []).filter((f) => f.factor_type !== "recovery_code");
  if (!factoren.length) return uit(false, "Deze beheerder heeft geen tweestapsverificatie.");
  for (const f of factoren) {
    const { error: e } = await db.auth.admin.mfa.deleteFactor({ id: f.id, userId: doelId });
    if (e) return uit(false, `Verwijderen mislukt: ${e.message}`);
  }
  const email = (rij as { email?: string | null }).email ?? doelId;
  await logActie({
    actie: "beheerder.tweestap_resetten",
    onderwerpSoort: "beheerder",
    onderwerpId: doelId,
    omschrijving: `Tweestapsverificatie van ${email} verwijderd (${factoren.length} app${factoren.length === 1 ? "" : "s"})`,
    gebruiker: ik,
  });
  revalidatePath(PAD);
  return uit(true, `De tweestapsverificatie van ${email} is uitgezet. Laat diegene na het inloggen meteen een nieuwe app koppelen.`);
}

export async function wijzigWachtwoord(_v: BeheerUitkomst | null, fd: FormData): Promise<BeheerUitkomst> {
  // Iedere beheerder (elke rol) wijzigt het eigen wachtwoord; ook vóór het instellen van verplichte tweestapsverificatie.
  const ik = await vereisBeheerder(undefined, { zonderVerplichteMfa: true });
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
  await logActie({ actie: "beveiliging.wachtwoord_wijzigen", onderwerpSoort: "beheerder", onderwerpId: ik.id, omschrijving: "Eigen wachtwoord gewijzigd", gebruiker: ik });
  return uit(true, "Je wachtwoord is gewijzigd. Gebruik voortaan het nieuwe wachtwoord om in te loggen.");
}
