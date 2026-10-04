import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { gegevensVanContact } from "@/lib/nieuwsbrief/beheer";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// AVG-inzage: alles wat over dit contact is opgeslagen, als JSON-download.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ik = await vereisBeheerder("nieuwsbrief_contacten");
  const { id } = await params;
  const gegevens = UUID_PATROON.test(id) ? await gegevensVanContact(id) : null;
  if (!gegevens) {
    return new Response("Dit contact bestaat niet (meer).", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  await logActie({
    actie: "contact.avg_export",
    onderwerpSoort: "contact",
    onderwerpId: id,
    omschrijving: "AVG-inzage gedownload (alle gegevens van dit contact)",
    gebruiker: ik,
  });
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(gegevens, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gegevens-contact-${datum}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
