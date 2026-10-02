import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { leverAdvies } from "@/lib/advies-leveren";

export const runtime = "nodejs";
export const maxDuration = 300;

// Geplande opschoning (Vercel-cron): anonimiseert lichaamsmaten ouder dan de
// bewaartermijn en levert adviezen opnieuw waarvan de PDF of mail eerder mislukte.
// Beveiligd met CRON_SECRET (Vercel stuurt Authorization: Bearer ...).
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

  // Afgeronde tests zonder verzonden advies (ouder dan 10 minuten) opnieuw leveren.
  const { data: open } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "test_afgerond")
    .lt("afgerond_op", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  let opnieuwGeleverd = 0;
  for (const o of open ?? []) {
    try {
      if (await leverAdvies(o.id)) opnieuwGeleverd++;
    } catch (e) {
      console.error("Opnieuw leveren mislukt", o.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    geanonimiseerd: data ?? 0,
    bewaartermijn_dagen: dagen,
    opnieuw_geleverd: opnieuwGeleverd,
    nog_open: (open?.length ?? 0) - opnieuwGeleverd,
  });
}
