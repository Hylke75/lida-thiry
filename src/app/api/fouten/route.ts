import { registreerFout } from "@/lib/fouten/registreer";
import { isBrowserRuis, leesBrowserMelding, MAX_BROWSER_BYTES } from "@/lib/fouten/regels";
import { magDoor } from "@/lib/rate-limit";

export const runtime = "nodejs";

const LEEG = () => new Response(null, { status: 204 });

/** Leest de body tot `max` bytes; null als hij groter is. */
async function leesBeperkt(request: Request, max: number): Promise<string | null> {
  const lengte = Number(request.headers.get("content-length") ?? "0");
  if (lengte > max) return null;
  if (!request.body) return "";
  const lezer = request.body.getReader();
  const delen: Uint8Array[] = [];
  let totaal = 0;
  for (;;) {
    const { done, value } = await lezer.read();
    if (done) break;
    totaal += value.byteLength;
    if (totaal > max) {
      await lezer.cancel().catch(() => undefined);
      return null;
    }
    delen.push(value);
  }
  return Buffer.concat(delen).toString("utf8");
}

/**
 * Ontvangt fouten van de browser-rapporteur (components/FoutRapporteur.tsx) en
 * zet ze in de foutlog. Antwoordt altijd 204 (of 413/429), zodat de browser er
 * niets mee hoeft. Alleen vanaf de eigen site, met een limiet per IP-adres.
 */
export async function POST(request: Request) {
  const herkomst = request.headers.get("origin");
  if (herkomst) {
    try {
      if (new URL(herkomst).host !== new URL(request.url).host) return LEEG();
    } catch {
      return LEEG();
    }
  }
  const tekst = await leesBeperkt(request, MAX_BROWSER_BYTES);
  if (tekst === null) return new Response(null, { status: 413 });

  let json: unknown;
  try {
    json = JSON.parse(tekst);
  } catch {
    return LEEG();
  }
  const melding = leesBrowserMelding(json);
  if (!melding || isBrowserRuis(melding.bericht, melding.stack, melding.bestand)) return LEEG();

  if (!(await magDoor(request, "fouten", 20, 600))) return new Response(null, { status: 429 });

  await registreerFout({
    bron: "browser",
    fout: melding.bericht,
    stack: melding.stack,
    pad: melding.pad,
    digest: melding.digest,
    details: {
      soort: melding.soort,
      browser: (request.headers.get("user-agent") ?? "").slice(0, 200) || null,
      ...(melding.bestand ? { bestand: melding.bestand } : {}),
    },
  });
  return LEEG();
}
