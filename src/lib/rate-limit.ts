import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";

/**
 * Rate limiting via Postgres (tabel rate_limits + functie rate_limit_hit), zodat
 * het over serverless-instanties heen werkt. Het IP-adres wordt alleen als
 * SHA-256-hash opgeslagen. Faalt OPEN: als de database-aanroep mislukt, wordt
 * het verzoek doorgelaten (liever een bestelling dan een kapotte site).
 */

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const eerste = forwarded?.split(",")[0]?.trim();
  if (eerste) return eerste;
  const echt = request.headers.get("x-real-ip")?.trim();
  return echt || "onbekend";
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/** true = verzoek toegestaan. */
export async function magDoor(
  request: Request,
  naam: string,
  max: number,
  vensterSeconden: number,
): Promise<boolean> {
  return magDoorOpSleutel(`${naam}:${hashIp(clientIp(request))}`, max, vensterSeconden);
}

/**
 * Zoals magDoor, maar op een eigen sleutel (bijv. per e-mailadres). Hash
 * persoonsgegevens vooraf met hashIp. true = verzoek toegestaan.
 */
export async function magDoorOpSleutel(sleutel: string, max: number, vensterSeconden: number): Promise<boolean> {
  try {
    const { data, error } = await adminClient().rpc("rate_limit_hit", {
      p_sleutel: sleutel,
      p_venster_seconden: vensterSeconden,
      p_max: max,
    });
    if (error) {
      console.error("Rate limit-controle mislukt (doorgelaten)", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("Rate limit-controle mislukt (doorgelaten)", e);
    return true;
  }
}

export function teVeelVerzoeken(): NextResponse {
  return NextResponse.json(
    { fout: "Je hebt het te vaak achter elkaar geprobeerd. Wacht een paar minuten en probeer het dan opnieuw." },
    { status: 429, headers: { "Retry-After": "600" } },
  );
}
