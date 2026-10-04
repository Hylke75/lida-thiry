import { NextResponse } from "next/server";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { vrijeDagen } from "@/lib/afspraken/data";
import { geldigeUuid } from "@/lib/afspraken/regels";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// De vrije dagen en tijden voor een soort afspraak (voor het boekingsformulier).
export async function GET(request: Request) {
  if (!(await magDoor(request, "afspraak-tijden", 120, 600))) return teVeelVerzoeken();
  const soort = new URL(request.url).searchParams.get("soort") ?? "";
  if (!geldigeUuid(soort)) return NextResponse.json({ fout: "Onbekende soort afspraak." }, { status: 400 });
  try {
    const dagen = await vrijeDagen(soort);
    if (!dagen) return NextResponse.json({ fout: "Onbekende soort afspraak." }, { status: 404 });
    return NextResponse.json({ dagen }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("Vrije tijden ophalen mislukt", e);
    return NextResponse.json({ fout: "De beschikbare tijden konden niet worden geladen." }, { status: 500 });
  }
}
