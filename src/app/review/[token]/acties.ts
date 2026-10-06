"use server";

import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { stuurPushMelding } from "@/lib/push/versturen";
import { adminClient } from "@/lib/supabase/admin";
import { REVIEW_TOKEN_PATROON, valideerReview, type ReviewVeld } from "@/lib/reviews/regels";

export type ReviewUitkomst =
  | { ok: true }
  | { ok: false; fouten?: Partial<Record<ReviewVeld, string>>; afgesloten?: boolean; fout?: boolean };

/**
 * Slaat de review van de klant op. De geheime link (token) is het enige bewijs;
 * aanpassen kan zolang de beheerder de review nog niet heeft beoordeeld. Alleen
 * de eerste keer invullen (uitgenodigd → ingevuld) geeft een pushmelding.
 */
export async function bewaarReview(
  token: string,
  invoer: { sterren: number; tekst: string; naam: string; toestemming: boolean },
): Promise<ReviewUitkomst> {
  if (typeof token !== "string" || !REVIEW_TOKEN_PATROON.test(token)) return { ok: false, fout: true };
  const v = valideerReview({
    sterren: invoer?.sterren,
    tekst: typeof invoer?.tekst === "string" ? invoer.tekst.slice(0, 5_000) : "",
    naam: typeof invoer?.naam === "string" ? invoer.naam.slice(0, 500) : "",
    toestemming: invoer?.toestemming === true,
  });
  if (!v.ok) return { ok: false, fouten: v.fouten };

  let eersteKeer = false;
  try {
    const bewaar = (vanStatus: "uitgenodigd" | "ingevuld") =>
      adminClient()
        .from("beoordelingen")
        .update({
          sterren: v.waarde.sterren,
          tekst: v.waarde.tekst,
          naam: v.waarde.naam,
          toestemming_publicatie: v.waarde.toestemming,
          status: "ingevuld",
          ingevuld_op: new Date().toISOString(),
        })
        .eq("token", token)
        .not("email", "is", null)
        .eq("status", vanStatus)
        .select("id");
    // Eerst de overgang uitgenodigd → ingevuld (die telt als nieuwe review), anders een aanpassing.
    const eerst = await bewaar("uitgenodigd");
    if (eerst.error) throw eerst.error;
    eersteKeer = !!eerst.data?.length;
    if (!eersteKeer) {
      const later = await bewaar("ingevuld");
      if (later.error) throw later.error;
      if (!later.data?.length) return { ok: false, afgesloten: true };
    }
  } catch (e) {
    console.error("Review opslaan mislukt", e);
    return { ok: false, fout: true };
  }
  vernieuwPubliekeData("beoordelingen");
  revalidatePath("/admin/reviews");
  if (eersteKeer) {
    await stuurPushMelding("review", {
      titel: "Nieuwe review",
      tekst: `${v.waarde.naam || "Een klant"} · ${"★".repeat(v.waarde.sterren)}`,
      url: "/admin/reviews",
    });
  }
  return { ok: true };
}
