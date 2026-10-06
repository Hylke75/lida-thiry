"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { foutTekst } from "@/lib/beheermelding";
import { leesInstellingen } from "@/lib/instellingen";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import {
  datumInNederland,
  eindeVanDagNl,
  geldigEmail,
  leesCadeaubonInstellingen,
  plusDagen,
} from "@/lib/cadeaubon/regels";
import { leesDatum } from "@/lib/datum";
import { verstuurBon } from "@/lib/cadeaubon/verwerken";
import { betaalCadeaubonTerug } from "@/lib/verkoop/terugbetalen";
import type { Uitkomst } from "../../types/uitkomst";

const PAD = "/admin/cadeaubonnen";
const fout = (melding: string): Uitkomst => ({ ok: false, melding, tijd: Date.now() });
const goed = (melding: string): Uitkomst => ({ ok: true, melding, tijd: Date.now() });

function tekst(fd: FormData, naam: string): string {
  const v = fd.get(naam);
  return typeof v === "string" ? v.trim() : "";
}

function ververs(id: string) {
  revalidatePath(PAD);
  revalidatePath(`${PAD}/${id}`);
}

async function leesBon(id: string) {
  const { data, error } = await adminClient()
    .from("cadeaubon_bestellingen")
    .select("id, status, bezorging, verzend_op, koper_naam, koper_email, ontvanger_naam, ontvanger_email, kortingscode_id")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Code van de bon blokkeren of weer vrijgeven. */
export async function zetCodeActief(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const actief = tekst(fd, "actief") === "1";
  const bon = await leesBon(id).catch(() => null);
  if (!bon?.kortingscode_id) return fout("Deze bon heeft (nog) geen code.");
  const { error } = await adminClient().from("kortingscodes").update({ actief }).eq("id", bon.kortingscode_id);
  if (error) return fout(`Opslaan mislukt: ${error.message}`);
  await logActie({
    actie: actief ? "cadeaubon.code_vrijgeven" : "cadeaubon.code_blokkeren",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: actief ? "Code van de cadeaubon weer vrijgegeven" : "Code van de cadeaubon geblokkeerd",
    gebruiker: ik,
  });
  ververs(id);
  return goed(actief ? "De code werkt weer." : "De code is geblokkeerd.");
}

/** Geldigheid van de code verlengen (of inkorten) tot en met een datum. */
export async function wijzigGeldigheid(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const datum = tekst(fd, "geldig_tot");
  if (!leesDatum(datum)) return fout("Kies een geldige datum.");
  if (datum < datumInNederland(new Date())) return fout("Die datum ligt in het verleden.");
  const bon = await leesBon(id).catch(() => null);
  if (!bon?.kortingscode_id) return fout("Deze bon heeft (nog) geen code.");
  const { data: oud } = await adminClient().from("kortingscodes").select("geldig_tot").eq("id", bon.kortingscode_id).maybeSingle();
  const { error } = await adminClient()
    .from("kortingscodes")
    .update({ geldig_tot: eindeVanDagNl(datum) })
    .eq("id", bon.kortingscode_id);
  if (error) return fout(`Opslaan mislukt: ${error.message}`);
  await logActie({
    actie: "cadeaubon.geldigheid",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: `Geldigheid van de cadeauboncode gewijzigd naar t/m ${datum}`,
    details: { van: oud?.geldig_tot ?? null, naar: datum },
    gebruiker: ik,
  });
  ververs(id);
  return goed(`De code is geldig tot en met ${datum.split("-").reverse().join("-")}.`);
}

/** E-mailadres en naam van koper en ontvanger corrigeren. */
export async function wijzigAdressen(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const bon = await leesBon(id).catch(() => null);
  if (!bon) return fout("Cadeaubon niet gevonden.");
  const koperNaam = tekst(fd, "koper_naam").slice(0, 120);
  const koperEmail = tekst(fd, "koper_email").toLowerCase().slice(0, 254);
  const ontvangerNaam = tekst(fd, "ontvanger_naam").slice(0, 120) || null;
  const ontvangerEmail = tekst(fd, "ontvanger_email").toLowerCase().slice(0, 254) || null;
  if (koperNaam.length < 2) return fout("Vul de naam van de koper in.");
  if (!geldigEmail(koperEmail)) return fout("Het e-mailadres van de koper is niet geldig.");
  if (ontvangerEmail && !geldigEmail(ontvangerEmail)) return fout("Het e-mailadres van de ontvanger is niet geldig.");
  if (bon.bezorging === "ontvanger" && (!ontvangerEmail || !ontvangerNaam)) {
    return fout("Deze bon gaat naar de ontvanger: vul naam en e-mailadres van de ontvanger in.");
  }
  const nieuw = { koper_naam: koperNaam, koper_email: koperEmail, ontvanger_naam: ontvangerNaam, ontvanger_email: ontvangerEmail };
  const velden = (Object.keys(nieuw) as (keyof typeof nieuw)[]).filter((k) => (bon[k] ?? null) !== nieuw[k]);
  if (!velden.length) return goed("Er was niets gewijzigd.");
  const { error } = await adminClient().from("cadeaubon_bestellingen").update(nieuw).eq("id", id);
  if (error) return fout(`Opslaan mislukt: ${error.message}`);
  await logActie({
    actie: "cadeaubon.wijzigen",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: `Cadeaubon gewijzigd: ${velden.join(", ")}`,
    details: Object.fromEntries(velden.map((k) => [k, { van: bon[k] ?? null, naar: nieuw[k] }])),
    gebruiker: ik,
  });
  ververs(id);
  return goed(
    bon.status === "verzonden"
      ? "Opgeslagen. De bon is al verstuurd; stuur hem zo nodig opnieuw naar het juiste adres."
      : "Opgeslagen.",
  );
}

/** Geplande verzenddatum wijzigen (bon nog niet verstuurd). */
export async function wijzigPlanning(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const bon = await leesBon(id).catch(() => null);
  if (!bon) return fout("Cadeaubon niet gevonden.");
  if (bon.status !== "betaald" || bon.bezorging !== "ontvanger") {
    return fout("Alleen een betaalde bon die nog naar de ontvanger moet, heeft een planning.");
  }
  const datum = tekst(fd, "verzend_op");
  if (!leesDatum(datum)) return fout("Kies een geldige datum.");
  const vandaag = datumInNederland(new Date());
  const regels = leesCadeaubonInstellingen(await leesInstellingen());
  if (datum <= vandaag) return fout("Kies een datum na vandaag (of gebruik ‘Bon nu versturen’).");
  if (datum > plusDagen(vandaag, regels.maxVooruitDagen)) {
    return fout(`De datum mag hooguit ${regels.maxVooruitDagen} dagen vooruit liggen.`);
  }
  const { error } = await adminClient()
    .from("cadeaubon_bestellingen")
    .update({ verzend_op: datum })
    .eq("id", id)
    .eq("status", "betaald");
  if (error) return fout(`Opslaan mislukt: ${error.message}`);
  await logActie({
    actie: "cadeaubon.planning",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: `Verzenddatum van de cadeaubon gewijzigd naar ${datum}`,
    details: { van: bon.verzend_op, naar: datum },
    gebruiker: ik,
  });
  ververs(id);
  return goed("De verzenddatum is gewijzigd. Controleer zo nodig of de code lang genoeg geldig is.");
}

/**
 * Planning annuleren: de bon gaat niet (later) naar de ontvanger, maar nu naar de
 * koper, die hem zelf kan doorgeven.
 */
export async function annuleerPlanning(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const bon = await leesBon(id).catch(() => null);
  if (!bon || bon.status !== "betaald" || bon.bezorging !== "ontvanger") {
    return fout("Deze bon heeft geen planning (meer) om te annuleren.");
  }
  const { data: bijgewerkt, error } = await adminClient()
    .from("cadeaubon_bestellingen")
    .update({ bezorging: "koper", verzend_op: null })
    .eq("id", id)
    .eq("status", "betaald")
    .select("id");
  if (error || !bijgewerkt?.length) return fout(`Opslaan mislukt${error ? `: ${error.message}` : "."}`);
  let aan: string | null = null;
  let verzendFout: string | null = null;
  try {
    aan = await verstuurBon(id);
  } catch (e) {
    verzendFout = foutTekst(e);
  }
  await logActie({
    actie: "cadeaubon.planning_annuleren",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: `Planning naar de ontvanger geannuleerd${aan ? `; bon verstuurd naar ${aan}` : "; versturen mislukt"}`,
    details: { verzend_op: bon.verzend_op, ontvanger_email: bon.ontvanger_email },
    gebruiker: ik,
  });
  ververs(id);
  return verzendFout
    ? fout(`De planning is geannuleerd, maar versturen naar de koper mislukte: ${verzendFout}`)
    : goed(`De planning is geannuleerd en de bon is naar de koper (${aan}) gestuurd.`);
}

/** Bon (opnieuw) versturen, of een kopie naar de koper. */
export async function verstuur(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("cadeaubonnen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const kopie = tekst(fd, "kopie") === "1";
  let aan: string;
  try {
    aan = await verstuurBon(id, { kopieNaarKoper: kopie });
  } catch (e) {
    return fout(`Versturen mislukt: ${foutTekst(e)}`);
  }
  await logActie({
    actie: "cadeaubon.opnieuw_versturen",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: `Cadeaubon verstuurd naar ${aan}${kopie ? " (kopie naar koper)" : ""}`,
    gebruiker: ik,
  });
  ververs(id);
  return goed(`Cadeaubon verstuurd naar ${aan}.`);
}

/** Volledig of gedeeltelijk terugbetalen, met creditnota. */
export async function betaalTerug(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("terugbetalen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende cadeaubon.");
  const uitkomst = await betaalCadeaubonTerug(id, {
    volledig: tekst(fd, "omvang") !== "deel",
    invoer: tekst(fd, "bedrag"),
    reden: tekst(fd, "reden").replace(/\s+/g, " ").slice(0, 200) || null,
    toegangBehouden: fd.get("toegang_behouden") === "1",
    mailen: fd.get("mailen") === "1",
    door: ik.email ?? null,
  });
  if (!uitkomst.ok) return fout(uitkomst.melding);
  await logActie({
    actie: "cadeaubon.terugbetalen",
    onderwerpSoort: "cadeaubon",
    onderwerpId: id,
    omschrijving: uitkomst.melding,
    details: uitkomst.details,
    gebruiker: ik,
  });
  ververs(id);
  return goed(uitkomst.melding);
}
