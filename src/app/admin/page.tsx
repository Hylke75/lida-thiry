import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  aangemaakt: "Aangemaakt",
  betaald: "Betaald",
  test_afgerond: "Test afgerond",
  handmatige_beoordeling: "Handmatige beoordeling",
  advies_verzonden: "Advies verzonden",
  betaling_mislukt: "Betaling mislukt",
  verlopen: "Verlopen",
};

interface OrderRij {
  id: string;
  klantnaam: string;
  email: string;
  status: string;
  toegekend_type: string | null;
  aangemaakt_op: string;
}

function Rij({ o }: { o: OrderRij }) {
  return (
    <Link
      href={`/admin/order/${o.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
    >
      <span className="flex flex-col">
        <span className="font-medium">{o.klantnaam}</span>
        <span className="text-black/50 dark:text-white/50">{o.email}</span>
      </span>
      <span className="flex items-center gap-3">
        {o.toegekend_type && <span className="font-mono text-xs">{o.toegekend_type}</span>}
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">
          {STATUS_LABEL[o.status] ?? o.status}
        </span>
      </span>
    </Link>
  );
}

export default async function AdminPage() {
  await vereisBeheerder();
  const supabase = adminClient();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, klantnaam, email, status, toegekend_type, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })
    .limit(200);

  const alle = (orders ?? []) as OrderRij[];
  const twijfel = alle.filter((o) => o.status === "handmatige_beoordeling");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Beheer</h1>
        <form action="/auth/uitloggen" method="post">
          <button className="text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50">
            Uitloggen
          </button>
        </form>
      </header>

      {twijfel.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Twijfelgevallen ({twijfel.length})
          </h2>
          <div className="flex flex-col gap-2">
            {twijfel.map((o) => (
              <Rij key={o.id} o={o} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Alle bestellingen ({alle.length})
        </h2>
        {alle.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nog geen bestellingen.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {alle.map((o) => (
              <Rij key={o.id} o={o} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
