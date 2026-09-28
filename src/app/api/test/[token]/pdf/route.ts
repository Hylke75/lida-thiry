import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { genereerAdviesPdf, signedPdfUrl } from "@/lib/pdf/genereer";

export const runtime = "nodejs";

// Download van de advies-PDF via de testlink. Levert een tijdelijke signed URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = adminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, pdf_pad, toegekend_type, token_verloopt_op")
    .eq("testtoken", token)
    .single();

  if (!order) return NextResponse.json({ fout: "Onbekende testlink." }, { status: 404 });
  if (order.token_verloopt_op && new Date(order.token_verloopt_op) < new Date()) {
    return NextResponse.json({ fout: "Deze testlink is verlopen." }, { status: 403 });
  }
  if (!["test_afgerond", "advies_verzonden"].includes(order.status) || !order.toegekend_type) {
    return NextResponse.json({ fout: "Er is nog geen advies beschikbaar." }, { status: 409 });
  }

  let pad = order.pdf_pad as string | null;
  if (!pad) {
    try {
      pad = await genereerAdviesPdf(order.id);
    } catch {
      pad = null;
    }
  }
  if (!pad) return NextResponse.json({ fout: "Advies-PDF is nog niet beschikbaar." }, { status: 409 });

  const url = await signedPdfUrl(pad);
  if (!url) return NextResponse.json({ fout: "Downloadlink maken mislukt." }, { status: 500 });

  return NextResponse.redirect(url);
}
