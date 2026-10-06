import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstellingen } from "@/lib/instellingen";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { naBetaling } from "@/lib/bestelling-betaald";
import { vandaagAmsterdam, vanAmsterdam } from "@/lib/datum";
import { formatteerBedrag } from "@/lib/prijs";
import { valideerHandmatigeBestelling } from "@/lib/verkoop/regels";
import { AdminNav } from "../../AdminNav";
import { Melding } from "../../Melding";
import { invoer, invoerBreed, kaartVlak, knop, tekstUitleg } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const PAD = "/admin/bestellingen/nieuw";

/**
 * Maakt een betaalde bestelling aan zonder Mollie: gratis (goodwill) of betaald
 * buiten Mollie (bijv. per overboeking). Daarna dezelfde afhandeling als na een
 * Mollie-betaling (naBetaling): adresboek, factuur bij een bedrag > 0, en de
 * bevestigingsmail met de testlink.
 */
async function maakBestelling(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("bestellingen_aanmaken");
  const nu = new Date();
  const v = valideerHandmatigeBestelling(Object.fromEntries(formData.entries()), vandaagAmsterdam(nu));
  if (!v.ok) redirect(`${PAD}?fout=${encodeURIComponent(v.fout)}`);
  const b = v.waarde;

  const inst = await leesInstellingen();
  const dagen = Number(inst.token_geldigheid_dagen || "30");
  const valuta = inst.valuta || "EUR";
  // Een eerdere betaaldatum: midden op die dag (Nederlandse tijd), voor factuurdatum en jaar.
  const betaaldOp = b.betaaldOp ? vanAmsterdam(b.betaaldOp, 12 * 60).toISOString() : nu.toISOString();
  const { data: order, error } = await adminClient()
    .from("orders")
    .insert({
      klantnaam: b.klantnaam,
      email: b.email,
      factuurgegevens: b.factuurgegevens,
      bedrag_cent: b.bedragCent,
      valuta,
      status: "betaald",
      betaalwijze: b.soort,
      betaald_op: betaaldOp,
      nabetaling_poging_op: nu.toISOString(),
      testtoken: maakTesttoken(),
      token_verloopt_op: tokenVerlooptOp(dagen),
      beheer_notitie: b.notitie,
    })
    .select("id")
    .single();
  if (error || !order) {
    redirect(`${PAD}?fout=${encodeURIComponent(`Aanmaken mislukt: ${error?.message ?? "onbekend"}`)}`);
  }
  // Factuur (bij een bedrag), bevestigingsmail met testlink, adresboek. Gooit nooit;
  // bij een fout krijgt de beheerder een melding en herhaalt de nachtelijke ronde het.
  const afgehandeld = await naBetaling({ orderId: order.id, geldigDagen: dagen });
  await logActie({
    actie: "order.handmatig_aanmaken",
    onderwerpSoort: "order",
    onderwerpId: order.id,
    omschrijving:
      b.soort === "gratis"
        ? `Gratis bestelling aangemaakt voor ${b.klantnaam} <${b.email}>`
        : `Bestelling buiten Mollie betaald (${formatteerBedrag(b.bedragCent, valuta)}) aangemaakt voor ${b.klantnaam} <${b.email}>`,
    details: { soort: b.soort, bedrag_cent: b.bedragCent, betaald_op: betaaldOp, afgehandeld, notitie: b.notitie },
    gebruiker: ik,
  });
  revalidatePath("/admin/bestellingen");
  redirect(`/admin/order/${order.id}?melding=aangemaakt`);
}

export default async function NieuweBestellingPagina({ searchParams }: { searchParams: Promise<{ fout?: string }> }) {
  await vereisBeheerder("bestellingen_aanmaken");
  const { fout } = await searchParams;
  const vandaag = vandaagAmsterdam(new Date());

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/bestellingen" />
      <AdminKop
        terug={{ href: "/admin/bestellingen", label: "Terug naar bestellingen" }}
        titel="Nieuwe bestelling"
        beschrijving={
          <>
            Maak een bestelling aan zonder betaling via Mollie, bijvoorbeeld als goodwill of na een bankoverschrijving. De
            klant krijgt dezelfde bevestigingsmail met de testlink als na een gewone bestelling.
          </>
        }
      />
      {fout && <Melding soort="fout">{fout}</Melding>}

      <form action={maakBestelling} className={`${kaartVlak} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
        <label className="flex flex-col gap-1 text-sm">
          <span>Naam *</span>
          <input name="klantnaam" required minLength={2} maxLength={120} className={invoerBreed} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>E-mail *</span>
          <input name="email" type="email" required className={invoerBreed} />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm sm:col-span-2">
          <legend className="mb-1 font-medium">Soort</legend>
          <label className="flex items-start gap-2">
            <input type="radio" name="soort" value="gratis" defaultChecked className="mt-1" />
            <span>
              Gratis (goodwill)
              <span className={`block ${tekstUitleg}`}>€ 0, geen factuur. De klant krijgt de testlink per mail.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input type="radio" name="soort" value="overboeking" className="mt-1" />
            <span>
              Betaald buiten Mollie (bijv. overboeking)
              <span className={`block ${tekstUitleg}`}>
                Wordt als betaald vastgelegd; de klant krijgt de testlink en een factuur met het ontvangen bedrag.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm">
          <span>Ontvangen bedrag (bij betaald buiten Mollie)</span>
          <span className="flex items-center gap-2">
            <span className="text-foreground/70">€</span>
            <input name="bedrag" inputMode="decimal" placeholder="29,95" className={`${invoer} w-32`} />
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Betaald op</span>
          <input name="betaald_op" type="date" max={vandaag} defaultValue={vandaag} className={invoerBreed} />
        </label>

        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span>Adres (voor de factuur, optioneel)</span>
          <input name="adres" maxLength={200} className={invoerBreed} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Postcode</span>
          <input name="postcode" maxLength={20} className={invoerBreed} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Plaats</span>
          <input name="plaats" maxLength={100} className={invoerBreed} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Land</span>
          <input name="land" maxLength={100} className={invoerBreed} />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span>Interne notitie (alleen zichtbaar in het beheer)</span>
          <input name="notitie" maxLength={500} placeholder="Bijv. compensatie voor …" className={invoerBreed} />
        </label>
        <div className="sm:col-span-2">
          <button className={knop}>Bestelling aanmaken en mail sturen</button>
        </div>
      </form>
    </main>
  );
}
