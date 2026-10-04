import Link from "next/link";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { AdminNav } from "./AdminNav";
import { Dashboard } from "./Dashboard";
import { Livegang } from "./Livegang";
import { ORDER_RIJ_KOLOMMEN, OrderRij, type OrderRijGegevens } from "./bestellingen/OrderRij";

export const dynamic = "force-dynamic";

type Zoek = { q?: string; status?: string; periode?: string };

export default async function AdminPage({ searchParams }: { searchParams: Promise<Zoek> }) {
  await vereisBeheerder();
  const zoek = await searchParams;

  // Oude links (zoeken/filteren stond vroeger op /admin) blijven werken.
  if (zoek.q || zoek.status) {
    const p = new URLSearchParams();
    if (zoek.q) p.set("q", zoek.q);
    if (zoek.status) p.set("status", zoek.status);
    redirect(`/admin/bestellingen?${p.toString()}`);
  }

  const periode = zoek.periode === "30" ? "30" : undefined;
  const { data } = await adminClient()
    .from("orders")
    .select(ORDER_RIJ_KOLOMMEN)
    .order("aangemaakt_op", { ascending: false })
    .limit(5);
  const recent = (data ?? []) as OrderRijGegevens[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 sm:p-8">
      <AdminNav actief="/admin" />

      <Livegang />

      <Dashboard periode={periode} linkVoor={(p) => (p ? `/admin?periode=${p}` : "/admin")} />

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg">Laatste bestellingen</h2>
          <Link href="/admin/bestellingen" className="text-sm text-accent underline underline-offset-4">
            Alle bestellingen en zoeken →
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nog geen bestellingen.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((o) => (
              <OrderRij key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
