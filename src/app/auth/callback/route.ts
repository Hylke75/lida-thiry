import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { veiligVervolg } from "@/lib/beheerder-regels";

export const runtime = "nodejs";

// Wisselt de magic-link-code in voor een sessie en stuurt door naar het beheer.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Alleen een eigen pad (geen //andere-site.nl of volledige url): geen open redirect.
  const next = veiligVervolg(url.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/admin/inloggen?geen_toegang=1", url.origin));
}
