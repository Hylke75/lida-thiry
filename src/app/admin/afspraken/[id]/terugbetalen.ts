"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { geldigeUuid } from "@/lib/afspraken/regels";
import { betaalAanbetalingTerug } from "@/lib/verkoop/terugbetalen";
import type { Uitkomst } from "../../types/uitkomst";

/** Aanbetaling (geheel of gedeeltelijk) terugbetalen via Mollie. */
export async function betaalAanbetalingTerugActie(_v: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  const ik = await vereisBeheerder("terugbetalen");
  const id = String(fd.get("id") ?? "");
  if (!geldigeUuid(id)) return { ok: false, melding: "Onbekende afspraak.", tijd: Date.now() };
  const reden = String(fd.get("reden") ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || null;
  const uitkomst = await betaalAanbetalingTerug(id, {
    volledig: fd.get("omvang") !== "deel",
    invoer: String(fd.get("bedrag") ?? ""),
    reden,
  });
  if (!uitkomst.ok) return { ok: false, melding: uitkomst.melding, tijd: Date.now() };
  await logActie({
    actie: "afspraak.terugbetalen",
    onderwerpSoort: "afspraak",
    onderwerpId: id,
    omschrijving: uitkomst.melding,
    details: uitkomst.details,
    gebruiker: ik,
  });
  revalidatePath(`/admin/afspraken/${id}`);
  return { ok: true, melding: uitkomst.melding, tijd: Date.now() };
}
