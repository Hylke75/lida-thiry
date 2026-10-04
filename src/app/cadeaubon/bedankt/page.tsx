import type { Metadata } from "next";
import Link from "next/link";
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
      ontvanger: bon.ontvanger_naam?.trim() || bon.ontvanger_email || "de ontvanger",
      datum: bon.verzend_op ? leesbareDatum(bon.verzend_op) : "",
    };
    tekst = vulIn(verzendenIsAanDeBeurt(bon.verzend_op) ? t.tekstOntvanger : t.tekstGepland, w);
  }

  const knop =
    "mx-auto rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12 text-center">
      <div className="flex flex-col gap-6 rounded-2xl bg-kaart p-8 shadow-sm ring-1 ring-foreground/5">
        {betaald ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.titel}</h1>
            <p className="whitespace-pre-line text-foreground/70">{tekst}</p>
          </>
        ) : mislukt ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.misluktTitel}</h1>
            <p className="whitespace-pre-line text-foreground/70">{t.misluktTekst}</p>
            <Link href="/cadeaubon" className={knop}>
              {t.misluktKnop}
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.verwerkenTitel}</h1>
            <p className="whitespace-pre-line text-foreground/70">{t.verwerkenTekst}</p>
            {bon?.status === "aangemaakt" && <AutoVernieuwen />}
          </>
        )}
        <Link href="/" className="mx-auto text-sm text-foreground/50 underline underline-offset-4 hover:text-accent">
          ← Terug naar de startpagina
        </Link>
      </div>
    </main>
  );
}
