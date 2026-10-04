import { vereisBeheerder } from "@/lib/admin-auth";
import { maakCsv } from "@/lib/nieuwsbrief/csv";
import { alleDoorverwijzingen } from "@/lib/doorverwijzingen/beheer";
import { exportRijen } from "@/lib/doorverwijzingen/regels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// CSV-export (van;naar;permanent), hetzelfde formaat dat de import verwacht.
export async function GET() {
  await vereisBeheerder();
  const rijen = await alleDoorverwijzingen();
  const csv = maakCsv(exportRijen([...rijen].sort((a, b) => a.van.localeCompare(b.van))));
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="doorverwijzingen-${datum}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
