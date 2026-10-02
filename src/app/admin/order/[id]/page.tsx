import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { leverAdvies } from "@/lib/advies-leveren";
import { leesInstelling } from "@/lib/instellingen";
import { stuurTestlinkMail } from "@/lib/resend";
import { tokenVerlooptOp } from "@/lib/tokens";
import { AdminNav, Melding } from "../../AdminNav";
import { BETAALDE_STATUSSEN, statusLabel } from "../../status";

export const dynamic = "force-dynamic";

/** Geldige typesleutel: categorie 1–12 gevolgd door X, A, V, H of 8. */
const TYPE_PATROON = /^(1[0-2]|[1-9])[XAVH8]$/;

const MELDINGEN: Record<string, { soort: "ok" | "fout"; tekst: string }> = {
  type_ok: { soort: "ok", tekst: "Het type is aangepast en het advies is opnieuw verstuurd." },
  type_ok_levering_mislukt: {
    soort: "fout",
    tekst: "Het type is aangepast, maar het advies kon niet verstuurd worden. Probeer ‘Advies-PDF opnieuw versturen’.",
  },
  type_ongeldig: {
    soort: "fout",
    tekst: "Dat is geen geldig type. Gebruik een getal van 1 tot en met 12 gevolgd door X, A, V, H of 8 (bijvoorbeeld 8X of 12A).",
  },
  type_onbekend: {
    soort: "fout",
    tekst: "Dit type bestaat (nog) niet in de adviezen. Controleer of de adviesteksten voor dit type zijn geïmporteerd.",
  },
  advies_ok: { soort: "ok", tekst: "Het advies is opnieuw verstuurd." },
  advies_mislukt: { soort: "fout", tekst: "Het advies kon niet verstuurd worden. Probeer het later opnieuw." },
  testlink_ok: { soort: "ok", tekst: "De testlink is opnieuw naar de klant gestuurd." },
  testlink_niet_betaald: { soort: "fout", tekst: "Deze bestelling is niet betaald; er is geen testlink verstuurd." },
  testlink_mislukt: { soort: "fout", tekst: "De testlink kon niet verstuurd worden. Probeer het later opnieuw." },
};

function terug(id: string, melding: string): never {
  revalidatePath(`/admin/order/${id}`);
  redirect(`/admin/order/${id}?melding=${melding}`);
}

async function kenTypeToe(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  const sleutel = String(formData.get("sleutel") || "").trim().toUpperCase();
  if (!TYPE_PATROON.test(sleutel)) terug(id, "type_ongeldig");
  const supabase = adminClient();
  const { data: type } = await supabase.from("adviestypes").select("sleutel").eq("sleutel", sleutel).maybeSingle();
  if (!type) terug(id, "type_onbekend");

  await supabase
    .from("orders")
    .update({ toegekend_type: sleutel, status: "test_afgerond", afgerond_op: new Date().toISOString() })
    .eq("id", id);
  let gelukt = true;
  try {
    await leverAdvies(id);
  } catch {
    gelukt = false;
  }
  terug(id, gelukt ? "type_ok" : "type_ok_levering_mislukt");
}

async function verstuurOpnieuw(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  let gelukt = true;
  try {
    await leverAdvies(id);
  } catch {
    gelukt = false;
  }
  terug(id, gelukt ? "advies_ok" : "advies_mislukt");
}

async function stuurTestlinkOpnieuw(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  const supabase = adminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("klantnaam, email, status, testtoken, token_verloopt_op")
    .eq("id", id)
    .single();
  if (!order?.testtoken || !BETAALDE_STATUSSEN.includes(order.status)) terug(id, "testlink_niet_betaald");

  const geldigDagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
  // Is de link verlopen, dan krijgt de klant weer de volledige geldigheidsduur.
  if (order.token_verloopt_op && new Date(order.token_verloopt_op) < new Date()) {
    await supabase.from("orders").update({ token_verloopt_op: tokenVerlooptOp(geldigDagen) }).eq("id", id);
  }
  let gelukt = true;
  try {
    await stuurTestlinkMail({ naam: order.klantnaam, email: order.email, token: order.testtoken, geldigDagen });
  } catch {
    gelukt = false;
  }
  terug(id, gelukt ? "testlink_ok" : "testlink_mislukt");
}

async function verwijderBestelling(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  const supabase = adminClient();
  const { data } = await supabase.from("orders").select("pdf_pad").eq("id", id).single();
  if (data?.pdf_pad) await supabase.storage.from("adviezen-pdf").remove([data.pdf_pad]);
  await supabase.from("orders").delete().eq("id", id);
  redirect("/admin");
}

function Regel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 text-sm dark:border-white/10">
      <span className="text-black/50 dark:text-white/50">{label}</span>
      <span className="text-right">{waarde}</span>
    </div>
  );
}

const knopSecundair =
  "rounded-full border border-black/15 px-5 py-2.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5";

export default async function OrderDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ melding?: string }>;
}) {
  await vereisBeheerder();
  const { id } = await params;
  const { melding } = await searchParams;
  const supabase = adminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) {
    return (
      <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6 sm:p-8">
        <AdminNav />
        <p>Bestelling niet gevonden.</p>
        <Link href="/admin" className="text-sm underline">← Terug</Link>
      </main>
    );
  }
  const { data: r } = await supabase.from("testresultaten").select("*").eq("order_id", id).maybeSingle();
  const cm = (v: number | null | undefined) => (v == null ? "–" : `${v} cm`);
  const antwoorden = (r?.pasvormantwoorden ?? {}) as Record<string, string>;
  const m = melding ? MELDINGEN[melding] : undefined;
  const betaald = BETAALDE_STATUSSEN.includes(order.status);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav />
      <Link href="/admin" className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">← Terug naar overzicht</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{order.klantnaam}</h1>

      {m && <Melding soort={m.soort}>{m.tekst}</Melding>}

      <section className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
        <Regel label="E-mail" waarde={order.email} />
        <Regel label="Status" waarde={statusLabel(order.status)} />
        <Regel label="Toegekend type" waarde={order.toegekend_type ?? "–"} />
        <Regel label="Bedrag" waarde={order.bedrag_cent ? `€ ${(order.bedrag_cent / 100).toFixed(2)}` : "–"} />
        <Regel
          label="Testlink geldig tot"
          waarde={order.token_verloopt_op ? new Date(order.token_verloopt_op).toLocaleDateString("nl-NL") : "–"}
        />
      </section>

      {r ? (
        <section className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">Testresultaat</h2>
          <Regel label="Lengte" waarde={cm(r.lengte_cm)} />
          <Regel label="Gewicht" waarde={r.gewicht_kg == null ? "–" : `${r.gewicht_kg} kg`} />
          <Regel label="Borst / taille" waarde={`${cm(r.borst)} / ${cm(r.taille)}`} />
          <Regel label="Hoge heup / heup" waarde={`${cm(r.hoge_heup)} / ${cm(r.heup)}`} />
          <Regel label="Categorie" waarde={String(r.categorie ?? "–")} />
          <Regel label="FFIT-type" waarde={r.ffit_type ?? "–"} />
          <Regel label="Gekozen silhouet" waarde={r.gekozen_silhouet ?? "–"} />
          {Object.entries(antwoorden).map(([k, v]) => (
            <Regel key={k} label={k} waarde={String(v)} />
          ))}
        </section>
      ) : (
        <p className="text-sm text-black/50 dark:text-white/50">Nog geen testresultaat.</p>
      )}

      <section className="flex flex-col gap-5 rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">Acties</h2>

        {betaald && order.testtoken && (
          <form action={stuurTestlinkOpnieuw} className="flex flex-col gap-1">
            <input type="hidden" name="id" value={order.id} />
            <button className={`w-fit ${knopSecundair}`}>Testlink opnieuw sturen</button>
            <span className="text-xs text-black/50 dark:text-white/50">
              Stuurt de klant opnieuw de e-mail met de link naar de test. Is de link verlopen, dan wordt hij verlengd.
            </span>
          </form>
        )}

        {order.toegekend_type && (
          <form action={verstuurOpnieuw} className="flex flex-col gap-1">
            <input type="hidden" name="id" value={order.id} />
            <button className={`w-fit ${knopSecundair}`}>Advies-PDF opnieuw versturen</button>
            <span className="text-xs text-black/50 dark:text-white/50">Maakt de PDF opnieuw en mailt die naar de klant.</span>
          </form>
        )}

        {betaald && (
          <form action={kenTypeToe} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={order.id} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-black/70 dark:text-white/70">Type wijzigen (bijv. 8X of 12A)</span>
              <span className="text-xs text-black/50 dark:text-white/50">
                Alleen nodig als je het berekende type wilt overschrijven. De klant krijgt daarna het nieuwe advies per e-mail.
              </span>
              <span className="flex gap-2">
                <input
                  name="sleutel"
                  defaultValue={order.toegekend_type ?? ""}
                  maxLength={3}
                  className="w-28 rounded-lg border border-black/15 bg-transparent px-3 py-2 font-mono uppercase outline-none focus:border-accent dark:border-white/20"
                />
                <button className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
                  Wijzigen + versturen
                </button>
              </span>
            </label>
          </form>
        )}

        <form action={verwijderBestelling} className="border-t border-black/5 pt-4 dark:border-white/10">
          <input type="hidden" name="id" value={order.id} />
          <button className="rounded-full border border-red-300 px-5 py-2.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">
            Bestelling verwijderen
          </button>
        </form>
      </section>
    </main>
  );
}
