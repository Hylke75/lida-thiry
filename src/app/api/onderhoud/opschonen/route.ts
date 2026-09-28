import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";

export const runtime = "nodejs";

// Geplande opschoning (Vercel-cron): anonimiseert lichaamsmaten ouder dan de
// bewaartermijn. Beveiligd met CRON_SECRET (Vercel stuurt Authorization: Bearer ...).
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) {
    return NextResponse.json({ fout: "CRON_SECRET niet ingesteld." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${geheim}`) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }

  const dagen = Number((await leesInstelling("bewaartermijn_maten_dagen")) || "30");
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("anonimiseer_oude_maten", { dagen });
  if (error) {
    return NextResponse.json({ fout: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, geanonimiseerd: data ?? 0, bewaartermijn_dagen: dagen });
}
