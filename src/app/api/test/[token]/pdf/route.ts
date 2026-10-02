import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { genereerAdviesPdf, signedPdfUrl } from "@/lib/pdf/genereer";
import { adviesDownloadbaar, tokenVerlopen } from "@/lib/advies-toegang";

export const runtime = "nodejs";
export const maxDuration = 60;

// Download van de advies-PDF via de testlink. Levert een tijdelijke signed URL.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = adminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, pdf_pad, toegekend_type, token_verloopt_op, afgerond_op")
    .eq("testtoken", token)
    .single();

  if (!order) return NextResponse.json({ fout: "Onbekende testlink." }, { status: 404 });
  // Na het verlopen van de testlink blijft een afgerond advies nog
  // PDF_BESCHIKBAAR_DAGEN na het afronden te downloaden.
  if (!adviesDownloadbaar(order)) {
    if (tokenVerlopen(order)) {
      return NextResponse.json({ fout: "Deze testlink is verlopen." }, { status: 403 });
    }
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
