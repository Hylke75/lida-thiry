import { NextResponse } from "next/server";
import { meldAf } from "@/lib/nieuwsbrief/contacten";
import { afmeldPagina, TOKEN_PATROON, UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const runtime = "nodejs";

type Context = { params: Promise<{ token: string }> };

function verzending(request: Request): string | null {
  const v = new URL(request.url).searchParams.get("v");
  return v && UUID_PATROON.test(v) ? v : null;
}

/**
 * One-click afmelden (RFC 8058): mailprogramma's sturen een POST met
 * "List-Unsubscribe=One-Click". Antwoordt altijd 200, ook bij een onbekende
 * link, zodat niet is na te gaan welke links bestaan.
 */
export async function POST(request: Request, { params }: Context) {
  const { token } = await params;
  if (TOKEN_PATROON.test(token)) {
    try {
      await meldAf(token, verzending(request));
    } catch (e) {
      console.error("One-click afmelden mislukt", e);
      return new NextResponse(null, { status: 500 });
    }
  }
  return new NextResponse(null, { status: 200 });
}

/** Wie de link in een browser opent, gaat naar de afmeldpagina (met een knop; GET meldt nooit af). */
export async function GET(request: Request, { params }: Context) {
  const { token } = await params;
  if (!TOKEN_PATROON.test(token)) return NextResponse.redirect(new URL("/", request.url), 303);
  const v = verzending(request);
  return NextResponse.redirect(afmeldPagina(token) + (v ? `?v=${v}` : ""), 303);
}
