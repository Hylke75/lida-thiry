"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { foutTekst } from "@/lib/beheermelding";
import { nodigOrderUit, stuurUitnodigingOpnieuw } from "@/lib/reviews/uitnodigen";
import { ID_PATROON, isReviewStatus, valideerBeheerBewerking } from "@/lib/reviews/regels";

const PAD = "/admin/reviews";

/** Terug naar het juiste tabblad, met een melding. */
function terug(fd: FormData, melding: string, soort: "ok" | "fout" = "ok"): never {
  const p = new URLSearchParams();
  const tab = String(fd.get("tab") ?? "");
  if (isReviewStatus(tab)) p.set("tab", tab);
  p.set(soort, melding);
  redirect(`${PAD}?${p.toString()}`);
}

function vernieuw() {
  vernieuwPubliekeData("beoordelingen");
  revalidatePath(PAD);
  revalidatePath("/"); // de homepage toont goedgekeurde reviews
}

function id(fd: FormData, veld = "id"): string {
  const w = String(fd.get(veld) ?? "");
  if (!ID_PATROON.test(w)) terug(fd, "Onbekende review of bestelling.", "fout");
  return w;
}

const BEOORDELING: Record<string, { status: "goedgekeurd" | "afgewezen" | "ingevuld"; melding: string }> = {
  goedkeuren: { status: "goedgekeurd", melding: "Review goedgekeurd." },
  afwijzen: { status: "afgewezen", melding: "Review afgewezen." },
  terugzetten: { status: "ingevuld", melding: "Review teruggezet naar ‘Nieuw ingevuld’." },
};

export async function beoordeel(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("reviews");
  const reviewId = id(fd);
  const actie = BEOORDELING[String(fd.get("actie") ?? "")];
  if (!actie) terug(fd, "Onbekende actie.", "fout");
  const { data, error } = await adminClient()
    .from("beoordelingen")
    .update({
      status: actie.status,
      beoordeeld_op: actie.status === "ingevuld" ? null : new Date().toISOString(),
    })
    .eq("id", reviewId)
    .not("tekst", "is", null)
    .not("email", "is", null)
    .select("id");
  if (error) terug(fd, `Opslaan mislukt: ${error.message}`, "fout");
  if (!data?.length) terug(fd, "Deze review is (nog) niet ingevuld.", "fout");
  await logActie({
    actie: `review.${String(fd.get("actie"))}`,
    onderwerpSoort: "review",
    onderwerpId: reviewId,
    omschrijving: actie.melding,
    details: { status: actie.status },
    gebruiker: ik,
  });
  vernieuw();
  terug(fd, actie.melding);
}

export async function bewerk(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("reviews");
  const reviewId = id(fd);
  const v = valideerBeheerBewerking({ naam: fd.get("naam"), tekst: fd.get("tekst") });
  if (!v.ok) terug(fd, v.fout, "fout");
  const { error } = await adminClient()
    .from("beoordelingen")
    .update({ naam: v.naam, tekst: v.tekst })
    .eq("id", reviewId)
    .not("email", "is", null);
  if (error) terug(fd, `Opslaan mislukt: ${error.message}`, "fout");
  await logActie({ actie: "review.bewerken", onderwerpSoort: "review", onderwerpId: reviewId, omschrijving: "Review bewerkt", gebruiker: ik });
  vernieuw();
  terug(fd, "Wijzigingen opgeslagen.");
}

/**
 * Verwijdert een review. Hoort hij bij een bestelling, dan blijft er een lege
 * rij (zonder naam, e-mail en tekst) over, zodat de klant niet opnieuw
 * automatisch wordt uitgenodigd.
 */
export async function verwijder(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("reviews_uitnodigen");
  const reviewId = id(fd);
  const supabase = adminClient();
  const { data } = await supabase.from("beoordelingen").select("order_id").eq("id", reviewId).maybeSingle();
  if (!data) terug(fd, "Review niet gevonden.", "fout");
  const { error } = data.order_id
    ? await supabase
        .from("beoordelingen")
        .update({
          email: null,
          naam: null,
          tekst: null,
          sterren: null,
          toestemming_publicatie: false,
          status: "afgewezen",
          beoordeeld_op: new Date().toISOString(),
        })
        .eq("id", reviewId)
    : await supabase.from("beoordelingen").delete().eq("id", reviewId);
  if (error) terug(fd, `Verwijderen mislukt: ${error.message}`, "fout");
  await logActie({ actie: "review.verwijderen", onderwerpSoort: "review", onderwerpId: reviewId, omschrijving: "Review verwijderd", gebruiker: ik });
  vernieuw();
  terug(fd, "Review verwijderd.");
}

export async function nodigUit(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("reviews_uitnodigen");
  const orderId = id(fd, "order_id");
  let email: string;
  try {
    ({ email } = await nodigOrderUit(orderId));
  } catch (e) {
    terug(fd, `Uitnodigen mislukt: ${foutTekst(e)}`, "fout");
  }
  await logActie({ actie: "review.uitnodigen", onderwerpSoort: "order", onderwerpId: orderId, omschrijving: `Reviewuitnodiging verstuurd naar ${email}`, gebruiker: ik });
  vernieuw();
  terug(fd, `Uitnodiging verstuurd naar ${email}.`);
}

export async function stuurOpnieuw(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("reviews_uitnodigen");
  const reviewId = id(fd);
  let email: string;
  try {
    ({ email } = await stuurUitnodigingOpnieuw(reviewId));
  } catch (e) {
    terug(fd, `Opnieuw sturen mislukt: ${foutTekst(e)}`, "fout");
  }
  await logActie({ actie: "review.uitnodiging_opnieuw", onderwerpSoort: "review", onderwerpId: reviewId, omschrijving: `Reviewuitnodiging opnieuw verstuurd naar ${email}`, gebruiker: ik });
  vernieuw();
  terug(fd, `Uitnodiging opnieuw verstuurd naar ${email}.`);
}
