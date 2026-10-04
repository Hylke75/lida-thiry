import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstellingen, leesPrijsCent } from "./instellingen";
import { ontbrekendeLetters } from "@/rekenkern/letter";
import { haalFfitToewijzing, haalLichaamstypes } from "./lichaamstypes";
import { leesAlleInhoud } from "./inhoud/lees";
import { GROEPEN } from "./inhoud/register";
import { evalueerLivegang, livegangStatus, type LivegangItem } from "./livegang";
import { alleRijen } from "@/app/admin/types/gedeeld";

/**
 * Productie-gereedheid ("Klaar voor livegang"): haalt de benodigde gegevens op
 * en laat de beoordeling over aan de pure functie in livegang.ts.
 * Bewust zuinig: per tabel één (gepagineerde) query met alleen de nodige kolommen.
 */
export async function productieCheck(): Promise<{ items: LivegangItem[] } & ReturnType<typeof livegangStatus>> {
  const supabase = adminClient();
  const [instellingen, prijsCent, opgeslagenTeksten, lichaamstypes, toewijzing, typesRes, secties] = await Promise.all([
    leesInstellingen(),
    leesPrijsCent(),
    leesAlleInhoud().catch(() => new Map<string, unknown>()),
    haalLichaamstypes(),
    haalFfitToewijzing(),
    supabase.from("adviestypes").select("sleutel"),
    alleRijen<{ type_sleutel: string }>((van, tot) =>
      supabase.from("adviessecties").select("type_sleutel").order("id").range(van, tot),
    ),
  ]);
  if (typesRes.error) throw new Error(`adviestypes lezen: ${typesRes.error.message}`);

  const perType = new Map<string, number>();
  for (const s of secties) perType.set(s.type_sleutel, (perType.get(s.type_sleutel) ?? 0) + 1);

  const items = evalueerLivegang({
    prijsCent,
    instellingen,
    tekstgroepen: GROEPEN,
    opgeslagenTeksten,
    lichaamstypes,
    adviestypes: ((typesRes.data ?? []) as { sleutel: string }[]).map((t) => ({
      sleutel: t.sleutel,
      secties: perType.get(t.sleutel) ?? 0,
    })),
    ontbrekendeKoppelingen: ontbrekendeLetters(toewijzing),
    omgeving: {
      GRATIS_TEST: process.env.GRATIS_TEST,
      RESEND_VAN: process.env.RESEND_VAN,
      RESEND_API_KEY: process.env.RESEND_API_KEY,
      MOLLIE_API_KEY: process.env.MOLLIE_API_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
  });
  return { items, ...livegangStatus(items) };
}
