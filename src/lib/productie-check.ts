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
  const [instellingen, prijsCent, opgeslagenTeksten, lichaamstypes, toewijzing, typesRes, secties, aangemeld, contactformulier] = await Promise.all([
    leesInstellingen(),
    leesPrijsCent(),
    leesAlleInhoud().catch(() => new Map<string, unknown>()),
    haalLichaamstypes(),
    haalFfitToewijzing(),
    supabase.from("adviestypes").select("sleutel"),
    alleRijen<{ type_sleutel: string }>((van, tot) =>
      supabase.from("adviessecties").select("type_sleutel").order("id").range(van, tot),
    ),
    // Nieuwsbrief: een fout (bijv. tabel nog niet aanwezig) mag de lijst niet breken.
    Promise.resolve(
      supabase.from("nb_contacten").select("id", { count: "exact", head: true }).eq("status", "aangemeld"),
    ).then(
      (r) => r.count ?? 0,
      () => 0,
    ),
    // Contactformulier: een gepubliceerde pagina met het blok {contactformulier}.
    Promise.resolve(
      supabase
        .from("paginas")
        .select("id", { count: "exact", head: true })
        .eq("status", "gepubliceerd")
        .ilike("inhoud", "%{contactformulier}%"),
    ).then(
      (r) => !r.error && (r.count ?? 0) > 0,
      () => false,
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
      RESEND_WEBHOOK_SECRET: process.env.RESEND_WEBHOOK_SECRET,
      NIEUWSBRIEF_GEHEIM: process.env.NIEUWSBRIEF_GEHEIM,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
      VAPID_SUBJECT: process.env.VAPID_SUBJECT,
    },
    aangemeldeContacten: aangemeld,
    contactformulierGepubliceerd: contactformulier,
  });
  return { items, ...livegangStatus(items) };
}
