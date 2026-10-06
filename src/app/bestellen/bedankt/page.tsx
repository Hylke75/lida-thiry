import type { Metadata } from "next";
import { Knop, TekstLink } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantMelding, KlantPagina } from "@/components/site/KlantPagina";
import { adminClient } from "@/lib/supabase/admin";
import { leesSectie } from "@/lib/inhoud/lees";
import { BESTELLEN_BETAALD, BESTELLEN_MISLUKT, BESTELLEN_VERWERKEN } from "@/lib/inhoud/groepen/bestellen";
import { MIJN_ADVIES_PAGINA } from "@/lib/inhoud/groepen/mijn-advies";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { isBetaald, testlinkNogTonen } from "@/lib/order-status";
import { leesInstellingen } from "@/lib/instellingen";
import { leesVerkoopTijden } from "@/lib/verkoop/regels";
import { AutoVernieuwen } from "./AutoVernieuwen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bedankt voor je bestelling",
  robots: { index: false, follow: false },
};

export default async function BedanktPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let status: string | null = null;
  let token: string | null = null;
  if (orderId && UUID_PATROON.test(orderId)) {
    try {
      const { data } = await adminClient()
        .from("orders")
        .select("status, testtoken, betaald_op")
        .eq("id", orderId)
        .maybeSingle();
      status = data?.status ?? null;
      // De testlink alleen kort na betalen tonen: de bedankpagina-URL (met
      // order-id) kan in de browsergeschiedenis blijven staan. Daarna staat hij in de mail.
      const uren = leesVerkoopTijden(await leesInstellingen()).testlinkZichtbaarUren;
      token = testlinkNogTonen(data?.betaald_op ?? null, new Date(), uren) ? (data?.testtoken ?? null) : null;
    } catch {
      status = null;
    }
  }

  const betaald = isBetaald(status);
  const mislukt = status === "betaling_mislukt" || status === "verlopen";
  const [tBetaald, tMislukt, tVerwerken, tMijnAdvies] = await Promise.all([
    leesSectie(BESTELLEN_BETAALD),
    leesSectie(BESTELLEN_MISLUKT),
    leesSectie(BESTELLEN_VERWERKEN),
    leesSectie(MIJN_ADVIES_PAGINA),
  ]);

  const accent = betaald ? "sage" : mislukt ? "coral" : "butter";
  const bovenschrift = betaald ? tBetaald.bovenschrift : mislukt ? tMislukt.bovenschrift : tVerwerken.bovenschrift;
  return (
    <KlantPagina midden>
      <KlantKaart accent={accent} className="flex flex-col items-center gap-6">
        {betaald ? (
          <>
            <KlantKop midden bovenschrift={bovenschrift} titel={tBetaald.titel} className="mb-0! tablet:mb-0!">
              <p className="whitespace-pre-line">{tBetaald.tekst}</p>
            </KlantKop>
            {token ? (
              <Knop href={`/test/${token}`} pijl={false}>
                {tBetaald.knop}
              </Knop>
            ) : (
              <KlantMelding className="text-left">{tBetaald.geenLink}</KlantMelding>
            )}
            {tMijnAdvies.verwijzing.trim() && (
              <TekstLink href="/mijn-advies" className="text-[14px]">
                {tMijnAdvies.verwijzing}
              </TekstLink>
            )}
          </>
        ) : mislukt ? (
          <>
            <KlantKop midden bovenschrift={bovenschrift} titel={tMislukt.titel} className="mb-0! tablet:mb-0!">
              <p className="whitespace-pre-line">{tMislukt.tekst}</p>
            </KlantKop>
            <Knop href="/bestellen" pijl={false}>
              {tMislukt.knop}
            </Knop>
          </>
        ) : (
          <>
            <KlantKop midden bovenschrift={bovenschrift} titel={tVerwerken.titel} className="mb-0! tablet:mb-0!">
              <p className="whitespace-pre-line">{tVerwerken.tekst}</p>
            </KlantKop>
            {status === "aangemaakt" && <AutoVernieuwen />}
          </>
        )}
        <TekstLink href="/" className="text-[14px] text-ink-soft">
          {tBetaald.terugLink}
        </TekstLink>
      </KlantKaart>
    </KlantPagina>
  );
}
