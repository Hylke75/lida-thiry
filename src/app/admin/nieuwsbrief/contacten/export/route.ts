import { vereisBeheerder } from "@/lib/admin-auth";
import { alleContacten } from "@/lib/nieuwsbrief/beheer";
import { leesFilter } from "@/lib/nieuwsbrief/contactregels";
import { maakCsv } from "@/lib/nieuwsbrief/csv";
import { BRON_LABEL, STATUS_LABEL } from "@/lib/nieuwsbrief/doelgroep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// CSV-export van de contacten binnen het huidige filter (zelfde parameters als de lijst).
export async function GET(request: Request) {
  await vereisBeheerder();
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const { pagina: _pagina, ...filter } = leesFilter(params);
  void _pagina;
  const contacten = await alleContacten(filter);
  const csv = maakCsv([
    ["email", "naam", "status", "bron", "tags", "toestemming_op", "toestemming_tekst", "bevestigd_op", "afgemeld_op", "aangemaakt_op"],
    ...contacten.map((c) => [
      c.email,
      c.naam ?? "",
      STATUS_LABEL[c.status] ?? c.status,
      BRON_LABEL[c.bron] ?? c.bron,
      c.tags.join("|"),
      c.toestemming_op ?? "",
      c.toestemming_tekst ?? "",
      c.bevestigd_op ?? "",
      c.afgemeld_op ?? "",
      c.aangemaakt_op,
    ]),
  ]);
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacten-${datum}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
