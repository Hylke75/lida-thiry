import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie, zoekLogboek } from "@/lib/beheer-log";
import { leesLogFilter, logCsvRijen, type LogRij } from "@/lib/beheer-log-regels";
import { maakCsv } from "@/lib/nieuwsbrief/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const PER_KEER = 1000;
const MAX_RIJEN = 20_000;

// CSV-export van het logboek binnen het huidige filter (zelfde parameters als de lijst).
export async function GET(request: Request) {
  const ik = await vereisBeheerder("logboek");
  const filter = leesLogFilter(Object.fromEntries(new URL(request.url).searchParams));
  const rijen: LogRij[] = [];
  try {
    for (let vanaf = 0; vanaf < MAX_RIJEN; vanaf += PER_KEER) {
      const { rijen: deel } = await zoekLogboek({ ...filter, pagina: 1 }, { aantal: PER_KEER, vanaf });
      rijen.push(...deel);
      if (deel.length < PER_KEER) break;
    }
  } catch (e) {
    return new Response(`Exporteren mislukt: ${e instanceof Error ? e.message : String(e)}`, {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  await logActie({
    actie: "logboek.exporteren",
    onderwerpSoort: "logboek",
    omschrijving: `Logboek geëxporteerd (${rijen.length} regels)`,
    details: { filter },
    gebruiker: ik,
  });
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(maakCsv(logCsvRijen(rijen)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="logboek-${datum}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
