import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { VERZEND_STATUS_LABEL, naarCsv } from "@/lib/nieuwsbrief/rapport";
import { haalCampagne } from "@/lib/nieuwsbrief/verzenden";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Rij {
  email: string;
  status: string;
  fout: string | null;
  verzonden_op: string | null;
  geopend_op: string | null;
  aantal_geopend: number;
  geklikt_op: string | null;
  aantal_kliks: number;
  afgemeld_op: string | null;
  gebounced_op: string | null;
}

const tijd = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", dateStyle: "short", timeStyle: "short" }) : "";

// Ontvangers van een campagne als CSV (puntkomma's, voor Excel), alleen voor beheerders.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await vereisBeheerder("nieuwsbrief_contacten");
  const { id } = await params;
  if (!UUID_PATROON.test(id)) return new Response("Onbekende campagne.", { status: 404 });
  const c = await haalCampagne(id);
  if (!c) return new Response("Onbekende campagne.", { status: 404 });

  const supabase = adminClient();
  const rijen: Rij[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase
      .from("nb_verzendingen")
      .select("email, status, fout, verzonden_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, afgemeld_op, gebounced_op")
      .eq("campagne_id", id)
      .order("email")
      .order("id")
      .range(van, van + 999);
    if (error) return new Response(`Exporteren mislukt: ${error.message}`, { status: 500 });
    rijen.push(...((data ?? []) as Rij[]));
    if (!data || data.length < 1000) break;
  }

  const csv = naarCsv(
    ["E-mail", "Status", "Verzonden op", "Geopend op", "Keer geopend", "Geklikt op", "Aantal kliks", "Afgemeld op", "Onbestelbaar op", "Foutmelding"],
    rijen.map((r) => [
      r.email,
      VERZEND_STATUS_LABEL[r.status] ?? r.status,
      tijd(r.verzonden_op),
      tijd(r.geopend_op),
      r.aantal_geopend,
      tijd(r.geklikt_op),
      r.aantal_kliks,
      tijd(r.afgemeld_op),
      tijd(r.gebounced_op),
      r.fout,
    ]),
  );
  const bestand = `ontvangers-${c.naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "campagne"}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${bestand}"`,
      "Cache-Control": "no-store",
    },
  });
}
