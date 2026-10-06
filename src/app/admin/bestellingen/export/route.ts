import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstellingen } from "@/lib/instellingen";
import { maakCsv } from "@/lib/nieuwsbrief/csv";
import { BETAALDE_STATUSSEN, TERUGBETAALD_STATUS } from "@/lib/order-status";
import { leesBtwProcent } from "@/lib/verkoop/regels";
import {
  cadeaubonExportRijen,
  creditnotaExportRijen,
  exportPeriode,
  isExportSoort,
  orderExportRijen,
  type ExportCadeaubon,
  type ExportCreditnota,
  type ExportOrder,
} from "@/lib/verkoop/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Grootste aantal rijen per export (ruim voor deze winkel). */
const MAX_RIJEN = 10_000;

// CSV-export voor de boekhouding: betaalde bestellingen, cadeaubonnen of
// creditnota's in een periode (?soort=…&van=yyyy-mm-dd&tot=yyyy-mm-dd, op
// betaal- of aanmaakdatum). maakCsv beschermt tegen formules in spreadsheets.
export async function GET(request: Request) {
  const ik = await vereisBeheerder("bestellingen");
  const zoek = new URL(request.url).searchParams;
  const soort = zoek.get("soort");
  if (!isExportSoort(soort)) return new Response("Onbekende export.", { status: 400 });
  const periode = exportPeriode(zoek.get("van"), zoek.get("tot"));
  if (!periode.ok) return new Response(periode.fout, { status: 400 });

  const supabase = adminClient();
  const btw = leesBtwProcent((await leesInstellingen()).btw_procent);
  let rijen: string[][];
  let aantal: number;

  if (soort === "bestellingen") {
    const { data, error } = await supabase
      .from("orders")
      .select(
        "id, klantnaam, email, factuurgegevens, status, bedrag_cent, korting_cent, kortingscode, valuta, betaald_op, factuurnummer, mollie_payment_id, betaalwijze, btw_procent, terugbetaald_cent",
      )
      .in("status", [...BETAALDE_STATUSSEN, TERUGBETAALD_STATUS])
      .gte("betaald_op", periode.vanIso)
      .lt("betaald_op", periode.totIso)
      .order("betaald_op", { ascending: true })
      .limit(MAX_RIJEN);
    if (error) return new Response(`Bestellingen ophalen mislukt: ${error.message}`, { status: 500 });
    aantal = data?.length ?? 0;
    rijen = orderExportRijen((data ?? []) as ExportOrder[], btw);
  } else if (soort === "cadeaubonnen") {
    const { data, error } = await supabase
      .from("cadeaubon_bestellingen")
      .select(
        "id, koper_naam, koper_email, ontvanger_naam, bedrag_cent, valuta, status, betaald_op, factuurnummer, mollie_payment_id, btw_procent, terugbetaald_cent, kortingscode_id",
      )
      .in("status", ["betaald", "verzonden"])
      .gte("betaald_op", periode.vanIso)
      .lt("betaald_op", periode.totIso)
      .order("betaald_op", { ascending: true })
      .limit(MAX_RIJEN);
    if (error) return new Response(`Cadeaubonnen ophalen mislukt: ${error.message}`, { status: 500 });
    const ids = (data ?? []).map((b) => b.kortingscode_id).filter((x): x is string => Boolean(x));
    const codes = new Map<string, { code: string; aantal_gebruikt: number }>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: c } = await supabase.from("kortingscodes").select("id, code, aantal_gebruikt").in("id", ids.slice(i, i + 200));
      for (const r of c ?? []) codes.set(r.id, r);
    }
    aantal = data?.length ?? 0;
    rijen = cadeaubonExportRijen(
      (data ?? []).map((b): ExportCadeaubon => {
        const c = b.kortingscode_id ? codes.get(b.kortingscode_id) : undefined;
        return { ...b, code: c?.code ?? null, code_gebruikt: c ? c.aantal_gebruikt > 0 : null };
      }),
      btw,
    );
  } else {
    const { data, error } = await supabase
      .from("creditnotas")
      .select(
        "nummer, origineel_nummer, soort, bedrag_cent, btw_procent, valuta, reden, mollie_refund_id, aangemaakt_op, orders(klantnaam, email), cadeaubon_bestellingen(koper_naam, koper_email)",
      )
      .gte("aangemaakt_op", periode.vanIso)
      .lt("aangemaakt_op", periode.totIso)
      .order("aangemaakt_op", { ascending: true })
      .limit(MAX_RIJEN);
    if (error) return new Response(`Creditnota's ophalen mislukt: ${error.message}`, { status: 500 });
    type Rij = Omit<ExportCreditnota, "naam" | "email"> & {
      orders: { klantnaam: string; email: string } | null;
      cadeaubon_bestellingen: { koper_naam: string; koper_email: string } | null;
    };
    const lijst = (data ?? []) as unknown as Rij[];
    aantal = lijst.length;
    rijen = creditnotaExportRijen(
      lijst.map(({ orders, cadeaubon_bestellingen, ...c }) => ({
        ...c,
        naam: orders?.klantnaam ?? cadeaubon_bestellingen?.koper_naam ?? "",
        email: orders?.email ?? cadeaubon_bestellingen?.koper_email ?? "",
      })),
    );
  }

  await logActie({
    actie: "verkoop.exporteren",
    onderwerpSoort: soort,
    omschrijving: `${aantal} ${soort} geëxporteerd (CSV, ${periode.van} t/m ${periode.tot})`,
    details: { soort, van: periode.van, tot: periode.tot, aantal },
    gebruiker: ik,
  });
  return new Response(maakCsv(rijen), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${soort}-${periode.van}-${periode.tot}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
