import { vereisBeheerder } from "@/lib/admin-auth";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { gegevensVanRelatie } from "@/lib/relaties/beheer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AVG-inzage: alles wat over deze relatie is opgeslagen, als JSON-download.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder();
  const { id } = await params;
  const gegevens = UUID_PATROON.test(id) ? await gegevensVanRelatie(id) : null;
  if (!gegevens) {
    return new Response("Deze relatie bestaat niet (meer).", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(gegevens, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gegevens-relatie-${datum}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
