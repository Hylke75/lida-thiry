import { vereisBeheerder } from "@/lib/admin-auth";
import { gegevensVanContact } from "@/lib/nieuwsbrief/beheer";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AVG-inzage: alles wat over dit contact is opgeslagen, als JSON-download.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder();
  const { id } = await params;
  const gegevens = UUID_PATROON.test(id) ? await gegevensVanContact(id) : null;
  if (!gegevens) {
    return new Response("Dit contact bestaat niet (meer).", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(gegevens, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gegevens-contact-${datum}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
