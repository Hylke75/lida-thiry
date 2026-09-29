import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { leverAdvies } from "@/lib/advies-leveren";

export const dynamic = "force-dynamic";

async function kenTypeToe(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  const sleutel = String(formData.get("sleutel") || "").trim().toUpperCase();
  if (!/^\d+[XAVH8]$/.test(sleutel)) return;
  const supabase = adminClient();
  await supabase
    .from("orders")
    .update({ toegekend_type: sleutel, status: "test_afgerond", afgerond_op: new Date().toISOString() })
    .eq("id", id);
  try {
    await leverAdvies(id);
  } catch {}
  revalidatePath(`/admin/order/${id}`);
}

async function verstuurOpnieuw(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id"));
  try {
    await leverAdvies(id);
  } catch {}
  revalidatePath(`/admin/order/${id}`);
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

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder();
  const { id } = await params;
  const supabase = adminClient();

  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <p>Bestelling niet gevonden.</p>
        <Link href="/admin" className="text-sm underline">← Terug</Link>
      </main>
    );
  }
  const { data: r } = await supabase.from("testresultaten").select("*").eq("order_id", id).maybeSingle();
  const cm = (v: number | null | undefined) => (v == null ? "–" : `${v} cm`);
  const antwoorden = (r?.pasvormantwoorden ?? {}) as Record<string, string>;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <Link href="/admin" className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">← Terug</Link>
      <h1 className="text-2xl font-semibold tracking-tight">{order.klantnaam}</h1>

      <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
        <Regel label="E-mail" waarde={order.email} />
        <Regel label="Status" waarde={order.status} />
        <Regel label="Toegekend type" waarde={order.toegekend_type ?? "–"} />
        <Regel label="Bedrag" waarde={order.bedrag_cent ? `€ ${(order.bedrag_cent / 100).toFixed(2)}` : "–"} />
      </section>

      {r ? (
        <section className="rounded-lg border border-black/10 p-4 dark:border-white/15">
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

      <section className="flex flex-col gap-4 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">Acties</h2>
        <form action={kenTypeToe} className="flex items-end gap-2">
          <input type="hidden" name="id" value={order.id} />
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Type handmatig toekennen (bijv. 8X)</span>
            <input
              name="sleutel"
              defaultValue={order.toegekend_type ?? ""}
              className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20"
            />
          </label>
          <button className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background hover:opacity-90">
            Toekennen + versturen
          </button>
        </form>
        <form action={verstuurOpnieuw}>
          <input type="hidden" name="id" value={order.id} />
          <button className="rounded-full border border-black/15 px-5 py-2.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5">
            Advies-PDF opnieuw versturen
          </button>
        </form>
        <form action={verwijderBestelling} className="pt-2">
          <input type="hidden" name="id" value={order.id} />
          <button className="rounded-full border border-red-300 px-5 py-2.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40">
            Bestelling verwijderen
          </button>
        </form>
      </section>
    </main>
  );
}
