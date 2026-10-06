import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { maakCsv } from "@/lib/nieuwsbrief/csv";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { alleRelaties, haalKoppelingen } from "@/lib/relaties/beheer";
import { exportRijen } from "@/lib/relaties/csv";
import { filterRelaties, leesRelatieFilter, sorteerRelaties } from "@/lib/relaties/zoeken";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// CSV-export van het adresboek: de geselecteerde relaties (?id=…&id=…) of alles
// binnen het huidige filter (zelfde parameters als de lijst). maakCsv beschermt
// tegen formules in spreadsheetprogramma's.
export async function GET(request: Request) {
  const ik = await vereisBeheerder("adresboek");
  const zoek = new URL(request.url).searchParams;
  const ids = new Set(zoek.getAll("id").filter((id) => UUID_PATROON.test(id)));
  const { pagina: _pagina, ...filter } = leesRelatieFilter(Object.fromEntries(zoek));
  void _pagina;

  const [relaties, koppelingen] = await Promise.all([alleRelaties(), haalKoppelingen()]);
  const gekozen = ids.size ? relaties.filter((r) => ids.has(r.id)) : filterRelaties(relaties, filter, koppelingen);
  const csv = maakCsv(exportRijen(sorteerRelaties(gekozen, filter.sort), koppelingen));
  await logActie({
    actie: "relatie.exporteren",
    onderwerpSoort: "relatie",
    omschrijving: `${gekozen.length} relatie(s) geëxporteerd (CSV)${ids.size ? ", selectie" : ""}`,
    details: { filter: ids.size ? undefined : filter },
    gebruiker: ik,
  });
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="adresboek-${datum}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
