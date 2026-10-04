import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { heeftRecht } from "@/lib/rollen";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { AdminNav } from "../AdminNav";
import { STATUS_LABEL } from "../status";
import { ORDER_RIJ_KOLOMMEN, OrderRij, type OrderRijGegevens } from "./OrderRij";

export const dynamic = "force-dynamic";

const PAD = "/admin/bestellingen";
const MAX = 200;

// Alleen actief in testmodus (env-gated). Maakt een verse betaalde testbestelling
// met unieke gegevens en opent direct de test.
async function nieuweTest() {
  "use server";
  await vereisBeheerder("bestellingen");
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
  const ik = await vereisBeheerder("bestellingen_verwijderen");
  if (!process.env.GRATIS_TEST) return;
  const supabase = adminClient();
  const { data } = await supabase.from("orders").select("pdf_pad");
  const paden = (data ?? []).map((o) => o.pdf_pad).filter(Boolean) as string[];
  if (paden.length) await supabase.storage.from("adviezen-pdf").remove(paden);
  await supabase.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await logActie({
    actie: "order.alle_verwijderen",
    onderwerpSoort: "order",
    omschrijving: `Alle ${data?.length ?? 0} bestellingen verwijderd (testmodus)`,
    gebruiker: ik,
  });
  revalidatePath(PAD);
  revalidatePath("/admin");
}

type Zoek = { q?: string; status?: string };

/** Bouwt een link naar deze pagina met de huidige filters, met enkele waarden aangepast. */
function lijstLink(huidig: Zoek, wijziging: Partial<Zoek>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...huidig, ...wijziging })) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `${PAD}?${s}` : PAD;
}

export default async function BestellingenPagina({ searchParams }: { searchParams: Promise<Zoek> }) {
  const ik = await vereisBeheerder("bestellingen");
  const zoek = await searchParams;
  const q = (zoek.q ?? "").trim();
  const status = zoek.status && zoek.status in STATUS_LABEL ? zoek.status : undefined;
  const huidig: Zoek = { q: q || undefined, status };

  let query = adminClient()
    .from("orders")
    .select(ORDER_RIJ_KOLOMMEN)
    .order("aangemaakt_op", { ascending: false })
    .limit(MAX);
  // Tekens die de filtersyntax van Supabase verstoren weghalen.
  const veilig = q.replace(/[,()*%\\"']/g, " ").trim();
  if (veilig) {
    query = query.or(`klantnaam.ilike.*${veilig}*,email.ilike.*${veilig}*,toegekend_type.ilike.*${veilig}*`);
  }
  if (status) query = query.eq("status", status);
  const { data: orders } = await query;
  const lijst = (orders ?? []) as OrderRijGegevens[];

  const testmodus = Boolean(process.env.GRATIS_TEST);
  const gefilterd = Boolean(veilig || status);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/bestellingen" />
      <h1 className="text-2xl font-semibold tracking-tight">Bestellingen</h1>

      {testmodus && (
        <section className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
          <span className="text-sm font-medium">Testmodus</span>
          <form action={nieuweTest}>
            <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
              Nieuwe test starten
            </button>
          </form>
          {heeftRecht(ik.rol, "bestellingen_verwijderen") && (
            <form action={verwijderAlle}>
              <button className="rounded-full border border-black/15 px-5 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5">
                Alle testbestellingen verwijderen
              </button>
            </form>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3">
        <form action={PAD} method="get" className="flex flex-col gap-2 sm:flex-row">
          <input
            name="q"
            defaultValue={q}
            placeholder="Zoek op naam, e-mail of type (bijv. 8X)"
            aria-label="Zoeken"
            className="min-w-0 flex-1 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20"
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
            <Link href={lijstLink(huidig, { q: undefined, status: undefined })} className="underline underline-offset-4">
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
              <OrderRij key={o.id} o={o} />
            ))}
          </div>
        )}
        {lijst.length === MAX && (
          <p className="text-xs text-black/40 dark:text-white/40">
            Alleen de nieuwste {MAX} worden getoond. Gebruik zoeken om verder te kijken.
          </p>
        )}
      </section>
    </main>
  );
}
