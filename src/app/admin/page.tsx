import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { productieCheck } from "@/lib/productie-check";
import { leesInstelling } from "@/lib/instellingen";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";

export const dynamic = "force-dynamic";

// Alleen actief in testmodus (env-gated). Maakt een verse betaalde testbestelling
// met unieke gegevens en opent direct de test.
async function nieuweTest() {
  "use server";
  await vereisBeheerder();
  if (!process.env.GRATIS_TEST) return;
  const supabase = adminClient();
  const dagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
  const token = maakTesttoken();
  const stempel = new Date().toLocaleString("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  await supabase.from("orders").insert({
    klantnaam: `Test ${stempel}`,
    email: `test+${Date.now()}@voorbeeld.nl`,
    voorwaarden_akkoord: true,
    directe_levering_akkoord: true,
    bedrag_cent: 0,
    valuta: "EUR",
    status: "betaald",
    betaald_op: new Date().toISOString(),
    testtoken: token,
    token_verloopt_op: tokenVerlooptOp(dagen),
  });
  redirect(`/test/${token}`);
}

// Verwijdert alle bestellingen + hun PDF's (alleen in testmodus).
async function verwijderAlle() {
  "use server";
  await vereisBeheerder();
  if (!process.env.GRATIS_TEST) return;
  const supabase = adminClient();
  const { data } = await supabase.from("orders").select("pdf_pad");
  const paden = (data ?? []).map((o) => o.pdf_pad).filter(Boolean) as string[];
  if (paden.length) await supabase.storage.from("adviezen-pdf").remove(paden);
  await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  revalidatePath("/admin");
}

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
  const check = await productieCheck();
  const testmodus = Boolean(process.env.GRATIS_TEST);

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

      {testmodus && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
          <span className="text-sm font-medium">Testmodus</span>
          <form action={nieuweTest}>
            <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
              Nieuwe test starten
            </button>
          </form>
          {alle.length > 0 && (
            <form action={verwijderAlle}>
              <button className="rounded-full border border-black/15 px-5 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5">
                Alle testbestellingen verwijderen ({alle.length})
              </button>
            </form>
          )}
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Productie-gereedheid — {check.gereed ? "gereed ✅" : "nog niet gereed"}
        </h2>
        <ul className="flex flex-col gap-1 text-sm">
          {check.items.map((i) => (
            <li key={i.label} className="flex items-center gap-2">
              <span>{i.ok ? "✅" : "⛔"}</span>
              <span>{i.label}</span>
              {i.detail && <span className="text-black/40 dark:text-white/40">— {i.detail}</span>}
            </li>
          ))}
        </ul>
      </section>

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
