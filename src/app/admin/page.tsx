import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { productieCheck } from "@/lib/productie-check";
import { leesInstelling } from "@/lib/instellingen";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { AdminNav } from "./AdminNav";
import { Dashboard } from "./Dashboard";
import { STATUS_LABEL, statusLabel } from "./status";

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
      className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{o.klantnaam}</span>
        <span className="truncate text-black/50 dark:text-white/50">{o.email}</span>
        <span className="text-xs text-black/40 dark:text-white/40">
          {new Date(o.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {o.toegekend_type && <span className="font-mono text-xs">{o.toegekend_type}</span>}
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">{statusLabel(o.status)}</span>
      </span>
    </Link>
  );
}

type Zoek = { q?: string; status?: string; periode?: string };

/** Bouwt een /admin-link met de huidige filters, met enkele waarden aangepast. */
function adminLink(huidig: Zoek, wijziging: Partial<Zoek>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...huidig, ...wijziging })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `/admin?${s}` : "/admin";
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Zoek> }) {
  await vereisBeheerder();
  const zoek = await searchParams;
  const q = (zoek.q ?? "").trim();
  const status = zoek.status && zoek.status in STATUS_LABEL ? zoek.status : undefined;
  const periode = zoek.periode === "30" ? "30" : undefined;
  const huidig: Zoek = { q: q || undefined, status, periode };
  const supabase = adminClient();

  let query = supabase
    .from("orders")
    .select("id, klantnaam, email, status, toegekend_type, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })
    .limit(200);
  // Tekens die de filtersyntax van Supabase verstoren weghalen.
  const veilig = q.replace(/[,()*%\\"']/g, " ").trim();
  if (veilig) {
    query = query.or(`klantnaam.ilike.*${veilig}*,email.ilike.*${veilig}*,toegekend_type.ilike.*${veilig}*`);
  }
  if (status) query = query.eq("status", status);
  const { data: orders } = await query;
  const lijst = (orders ?? []) as OrderRij[];

  const check = await productieCheck();
  const testmodus = Boolean(process.env.GRATIS_TEST);
  const gefilterd = Boolean(veilig || status);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-6 sm:p-8">
      <AdminNav actief="/admin" />

      {testmodus && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
          <span className="text-sm font-medium">Testmodus</span>
          <form action={nieuweTest}>
            <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
              Nieuwe test starten
            </button>
          </form>
          <form action={verwijderAlle}>
            <button className="rounded-full border border-black/15 px-5 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5">
              Alle testbestellingen verwijderen
            </button>
          </form>
        </section>
      )}

      <Dashboard periode={periode} linkVoor={(p) => adminLink(huidig, { periode: p })} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg">Bestellingen</h2>
        <form action="/admin" method="get" className="flex flex-col gap-2 sm:flex-row">
          {periode && <input type="hidden" name="periode" value={periode} />}
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek op naam, e-mail of type (bijv. 8X)"
            aria-label="Zoeken"
            className="flex-1 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            aria-label="Status"
            className="rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20"
          >
            <option value="">Alle statussen</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
            Zoeken
          </button>
        </form>
        {gefilterd && (
          <p className="text-sm text-black/60 dark:text-white/60">
            {lijst.length} gevonden ·{" "}
            <Link href={adminLink(huidig, { q: undefined, status: undefined })} className="underline underline-offset-4">
              filter wissen
            </Link>
          </p>
        )}
        {lijst.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {gefilterd ? "Geen bestellingen gevonden." : "Nog geen bestellingen."}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {lijst.map((o) => (
              <Rij key={o.id} o={o} />
            ))}
          </div>
        )}
        {lijst.length === 200 && (
          <p className="text-xs text-black/40 dark:text-white/40">Alleen de nieuwste 200 worden getoond. Gebruik zoeken om verder te kijken.</p>
        )}
      </section>

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
    </main>
  );
}
