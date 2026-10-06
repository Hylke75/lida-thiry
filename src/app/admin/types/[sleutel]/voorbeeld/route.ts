import { vereisBeheerder } from "@/lib/admin-auth";
import { genereerVoorbeeldPdf } from "@/lib/pdf/genereer";

export const runtime = "nodejs";
export const maxDuration = 60;

// Voorbeeld-PDF van een adviestype (met voorbeeldmaten), direct in de browser.
export async function GET(_request: Request, { params }: { params: Promise<{ sleutel: string }> }) {
  await vereisBeheerder("advies");
  const { sleutel } = await params;
  const pdf = await genereerVoorbeeldPdf(sleutel);
  if (!pdf) {
    return new Response("Dit adviestype bestaat niet.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="voorbeeld-${sleutel.replace(/[^A-Za-z0-9]/g, "")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
