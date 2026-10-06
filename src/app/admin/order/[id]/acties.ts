"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { eindeVanDagNl } from "@/lib/cadeaubon/regels";
import { vandaagAmsterdam } from "@/lib/datum";
import { BETAALDE_STATUSSEN, TERUGBETAALD_STATUS } from "@/lib/order-status";
import { gewijzigdeVelden, valideerOrderWijziging } from "@/lib/verkoop/regels";
import { betaalOrderTerug } from "@/lib/verkoop/terugbetalen";
import type { Uitkomst } from "../../types/uitkomst";

const fout = (melding: string): Uitkomst => ({ ok: false, melding, tijd: Date.now() });
const goed = (melding: string): Uitkomst => ({ ok: true, melding, tijd: Date.now() });

function tekst(fd: FormData, naam: string): string {
  const v = fd.get(naam);
  return typeof v === "string" ? v : "";
}

/** Naam, e-mail, factuurgegevens en de geldigheid van de testlink wijzigen. */
export async function wijzigOrder(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("bestellingen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende bestelling.");
  const v = valideerOrderWijziging(Object.fromEntries(fd.entries()), vandaagAmsterdam(new Date()));
  if (!v.ok) return fout(v.fout);

  const supabase = adminClient();
  const { data: oud, error } = await supabase
    .from("orders")
    .select("klantnaam, email, factuurgegevens, token_verloopt_op, testtoken")
    .eq("id", id)
    .maybeSingle();
  if (error) return fout(`Lezen mislukt: ${error.message}`);
  if (!oud) return fout("Bestelling niet gevonden.");

  const nieuw: Record<string, unknown> = {
    klantnaam: v.waarde.klantnaam,
    email: v.waarde.email,
    factuurgegevens: v.waarde.factuurgegevens,
  };
  if (v.waarde.tokenGeldigTot) {
    if (!oud.testtoken) return fout("Deze bestelling heeft (nog) geen testlink.");
    const nieuweEinde = eindeVanDagNl(v.waarde.tokenGeldigTot);
    // Alleen wijzigen als de datum echt anders is (het formulier toont de huidige).
    const oudeDatum = oud.token_verloopt_op ? vandaagAmsterdam(new Date(oud.token_verloopt_op)) : null;
    if (oudeDatum !== v.waarde.tokenGeldigTot) nieuw.token_verloopt_op = nieuweEinde;
  }
  const velden = gewijzigdeVelden(oud, nieuw);
  if (!velden.length) return goed("Er was niets gewijzigd.");

  const { error: e2 } = await supabase.from("orders").update(nieuw).eq("id", id);
  if (e2) return fout(`Opslaan mislukt: ${e2.message}`);
  await logActie({
    actie: "order.wijzigen",
    onderwerpSoort: "order",
    onderwerpId: id,
    omschrijving: `Bestelling gewijzigd: ${velden.join(", ")}`,
    details: Object.fromEntries(velden.map((k) => [k, { van: (oud as Record<string, unknown>)[k] ?? null, naar: nieuw[k] }])),
    gebruiker: ik,
  });
  revalidatePath(`/admin/order/${id}`);
  return goed(
    `Opgeslagen.${velden.includes("token_verloopt_op") ? " De testlink is geldig tot de gekozen datum." : ""}${
      velden.includes("email") || velden.includes("factuurgegevens")
        ? " Een al gemaakte factuur verandert niet mee."
        : ""
    }`,
  );
}

/** Volledig of gedeeltelijk terugbetalen, met creditnota. */
export async function betaalTerug(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("terugbetalen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende bestelling.");
  const reden = tekst(fd, "reden").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const uitkomst = await betaalOrderTerug(id, {
    volledig: tekst(fd, "omvang") !== "deel",
    invoer: tekst(fd, "bedrag"),
    reden,
    toegangBehouden: fd.get("toegang_behouden") === "1",
    mailen: fd.get("mailen") === "1",
    door: ik.email ?? null,
  });
  if (!uitkomst.ok) return fout(uitkomst.melding);
  await logActie({
    actie: "order.terugbetalen",
    onderwerpSoort: "order",
    onderwerpId: id,
    omschrijving: uitkomst.melding,
    details: uitkomst.details,
    gebruiker: ik,
  });
  revalidatePath(`/admin/order/${id}`);
  revalidatePath("/admin/bestellingen");
  return goed(uitkomst.melding);
}

/** Na een volledige terugbetaling de toegang tot de test toch weer geven. */
export async function herstelToegang(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("terugbetalen");
  const id = tekst(fd, "id");
  if (!UUID_PATROON.test(id)) return fout("Onbekende bestelling.");
  const supabase = adminClient();
  const { data: o } = await supabase.from("orders").select("status, status_voor_terugbetaling").eq("id", id).maybeSingle();
  if (!o || o.status !== TERUGBETAALD_STATUS) return fout("De toegang van deze bestelling is niet ingetrokken.");
  const terugNaar = (BETAALDE_STATUSSEN as readonly string[]).includes(o.status_voor_terugbetaling ?? "")
    ? (o.status_voor_terugbetaling as string)
    : "betaald";
  const { error } = await supabase
    .from("orders")
    .update({ status: terugNaar, status_voor_terugbetaling: null })
    .eq("id", id)
    .eq("status", TERUGBETAALD_STATUS);
  if (error) return fout(`Opslaan mislukt: ${error.message}`);
  await logActie({
    actie: "order.toegang_herstellen",
    onderwerpSoort: "order",
    onderwerpId: id,
    omschrijving: `Toegang tot de test hersteld (status: ${terugNaar})`,
    gebruiker: ik,
  });
  revalidatePath(`/admin/order/${id}`);
  return goed("De toegang tot de test is hersteld.");
}
