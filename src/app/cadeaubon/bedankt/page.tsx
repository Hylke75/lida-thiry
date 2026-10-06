import type { Metadata } from "next";
import { Knop, TekstLink } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { adminClient } from "@/lib/supabase/admin";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn } from "@/lib/inhoud/schema";
import { CADEAUBON_BEDANKT } from "@/lib/inhoud/groepen/cadeaubon";
import { leesbareDatum, verzendenIsAanDeBeurt } from "@/lib/cadeaubon/regels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { AutoVernieuwen } from "../../bestellen/bedankt/AutoVernieuwen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bedankt voor je cadeaubon",
  robots: { index: false, follow: false },
};

export default async function CadeaubonBedanktPage({
  searchParams,
}: {
  searchParams: Promise<{ bon?: string }>;
}) {
  const { bon: bonId } = await searchParams;
  let bon: {
    status: string;
    bezorging: string;
    ontvanger_naam: string | null;
    ontvanger_email: string | null;
    verzend_op: string | null;
  } | null = null;
  if (bonId && UUID_PATROON.test(bonId)) {
    try {
      const { data } = await adminClient()
        .from("cadeaubon_bestellingen")
        .select("status, bezorging, ontvanger_naam, ontvanger_email, verzend_op")
        .eq("id", bonId)
        .maybeSingle();
      bon = data;
    } catch {
      bon = null;
    }
  }
  const t = await leesSectie(CADEAUBON_BEDANKT);
  const betaald = bon?.status === "betaald" || bon?.status === "verzonden";
  const mislukt = bon?.status === "mislukt" || bon?.status === "verlopen";

  let tekst = t.tekstKoper;
  if (bon && bon.bezorging === "ontvanger") {
    const w = {
      ontvanger: bon.ontvanger_naam?.trim() || bon.ontvanger_email || t.ontvangerReserve,
      datum: bon.verzend_op ? leesbareDatum(bon.verzend_op) : "",
    };
    tekst = vulIn(verzendenIsAanDeBeurt(bon.verzend_op) ? t.tekstOntvanger : t.tekstGepland, w);
  }

  const kop = (bovenschrift: string, titel: string, tekst: string) => (
    <KlantKop midden bovenschrift={bovenschrift} titel={titel} className="mb-0! tablet:mb-0!">
      <p className="whitespace-pre-line">{tekst}</p>
    </KlantKop>
  );
  return (
    <KlantPagina midden>
      <KlantKaart accent={betaald ? "sage" : mislukt ? "coral" : "butter"} className="flex flex-col items-center gap-6">
        {betaald ? (
          kop(t.bovenschrift, t.titel, tekst)
        ) : mislukt ? (
          <>
            {kop(t.misluktBovenschrift, t.misluktTitel, t.misluktTekst)}
            <Knop href="/cadeaubon" pijl={false}>
              {t.misluktKnop}
            </Knop>
          </>
        ) : (
          <>
            {kop(t.verwerkenBovenschrift, t.verwerkenTitel, t.verwerkenTekst)}
            {bon?.status === "aangemaakt" && <AutoVernieuwen />}
          </>
        )}
        <TekstLink href="/" className="text-[16px] text-ink-soft">
          {t.terugLink}
        </TekstLink>
      </KlantKaart>
    </KlantPagina>
  );
}
