import { NextResponse } from "next/server";
import { haalAfspraakOpToken } from "@/lib/afspraken/data";
import { icsVoorAfspraak } from "@/lib/afspraken/mails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Het agendabestand van een afspraak (knop ‘Zet in je agenda’ op /afspraak/[token]).
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const a = await haalAfspraakOpToken(token);
  if (!a || a.status === "wacht_op_betaling") return NextResponse.json({ fout: "Niet gevonden." }, { status: 404 });
  const ics = await icsVoorAfspraak(a);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="afspraak.ics"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
