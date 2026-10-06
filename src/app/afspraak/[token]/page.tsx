import type { Metadata } from "next";
import { Knop, knopKlassen } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantPagina, klantMeldingKlassen } from "@/components/site/KlantPagina";
import { notFound, redirect } from "next/navigation";
import { AutoVernieuwen } from "@/app/bestellen/bedankt/AutoVernieuwen";
import { leesSectie } from "@/lib/inhoud/lees";
import { AFSPRAKEN_PAGINA } from "@/lib/inhoud/groepen/afspraken";
import { vulIn } from "@/lib/inhoud/schema";
import { afspraakInstellingen, annuleerDoorKlant, controleerBetaling, haalAfspraakOpToken, haalSoort } from "@/lib/afspraken/data";
import { bedragLabel, duurLabel, magAnnuleren, STATUS_LABEL } from "@/lib/afspraken/regels";
import { datumLabel, tijdLabel } from "@/lib/datum";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Je afspraak",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;
type Zoek = Promise<{ betaling?: string; geannuleerd?: string; fout?: string }>;

async function annuleer(formData: FormData) {
  "use server";
  const token = String(formData.get("token") ?? "");
  const r = await annuleerDoorKlant(token);
  if (r === "onbekend") notFound();
  if (r === "ok") redirect(`/afspraak/${token}?geannuleerd=1`);
  redirect(
    `/afspraak/${token}?fout=${encodeURIComponent(
      r === "te_laat" ? "Online annuleren kan niet meer." : "Annuleren is niet gelukt. Probeer het later opnieuw.",
    )}`,
  );
}

export default async function AfspraakTokenPagina({ params, searchParams }: { params: Params; searchParams: Zoek }) {
  const { token } = await params;
  const zoek = await searchParams;
  let a = await haalAfspraakOpToken(token);
  if (!a) notFound();
  if (a.status === "wacht_op_betaling") {
    // Terugval als de webhook nog niet is aangekomen (of lokaal, zonder webhook).
    await controleerBetaling(a);
    a = (await haalAfspraakOpToken(token)) ?? a;
  }
  const [t, inst, soort] = await Promise.all([
    leesSectie(AFSPRAKEN_PAGINA),
    afspraakInstellingen(),
    a.soort_id ? haalSoort(a.soort_id).catch(() => null) : Promise.resolve(null),
  ]);
  const uren = { uren: inst.minVoorafUren };
  const duur = Math.round((Date.parse(a.eind_op) - Date.parse(a.start_op)) / 60_000);
  const nu = new Date();
  const kanAnnuleren = magAnnuleren(a, nu, inst.minVoorafUren);
  const betalingMislukt = a.status === "geannuleerd" && a.aanbetaling_cent > 0 && !a.betaald_op && !!a.mollie_payment_id;
  const voorbij = Date.parse(a.start_op) < nu.getTime();
  const locatie = soort?.locatie || (soort?.online ? "Online" : "");

  const doorgestreept = a.status === "geannuleerd" ? "line-through" : "";
  return (
    <KlantPagina>
      <KlantKop bovenschrift="Persoonlijk advies" titel={t.titel}>
        <p>Status: {STATUS_LABEL[a.status]}</p>
      </KlantKop>

      <KlantKaart className="flex flex-col gap-6">
        {zoek.fout && (
          <p role="alert" className={`${klantMeldingKlassen("fout")} m-0`}>
            {zoek.fout}
          </p>
        )}

        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-[15px]">
          <dt className="font-bold text-ink-soft">Afspraak</dt>
          <dd className="m-0 font-bold text-ink">{soort?.naam ?? "Afspraak"}</dd>
          <dt className="font-bold text-ink-soft">Datum</dt>
          <dd className={`m-0 ${doorgestreept}`}>{datumLabel(a.start_op)}</dd>
          <dt className="font-bold text-ink-soft">Tijd</dt>
          <dd className={`m-0 ${doorgestreept}`}>
            {tijdLabel(a.start_op)} – {tijdLabel(a.eind_op)} ({duurLabel(duur)})
          </dd>
          {locatie && (
            <>
              <dt className="font-bold text-ink-soft">Locatie</dt>
              <dd className="m-0">{locatie}</dd>
            </>
          )}
          {a.aanbetaling_cent > 0 && (
            <>
              <dt className="font-bold text-ink-soft">Aanbetaling</dt>
              <dd className="m-0">
                {bedragLabel(a.aanbetaling_cent)}
                {a.betaald_op ? " (betaald)" : ""}
              </dd>
            </>
          )}
          <dt className="font-bold text-ink-soft">Naam</dt>
          <dd className="m-0">{a.naam}</dd>
        </dl>

        {a.status === "wacht_op_betaling" && (
          <>
            <p role="status" className={`${klantMeldingKlassen("letop")} m-0`}>
              {t.betaling_bezig}
            </p>
            <AutoVernieuwen />
          </>
        )}

        {a.status === "aangevraagd" && <p className={`${klantMeldingKlassen("info")} m-0`}>{t.aangevraagd}</p>}

        {a.status === "geannuleerd" && (
          <div className="flex flex-col items-start gap-4">
            <p role="status" className={`${klantMeldingKlassen("info")} m-0 w-full`}>
              {betalingMislukt && !zoek.geannuleerd ? t.betaling_mislukt : t.geannuleerd}
            </p>
            <Knop href="/afspraak" pijl={false}>
              Nieuwe afspraak maken
            </Knop>
          </div>
        )}

        {a.status === "bevestigd" && !voorbij && (
          <a href={`/afspraak/${a.token}/ics`} className={`${knopKlassen({ variant: "outline" })} w-full tablet:w-fit`}>
            {t.agenda_knop}
          </a>
        )}

        {(a.status === "bevestigd" || a.status === "aangevraagd") && !voorbij && (
          <section className="flex flex-col gap-3 border-t border-line pt-6">
            {kanAnnuleren ? (
              <>
                <p className="m-0 text-[15px] text-ink-soft">{vulIn(t.annuleren_uitleg, uren)}</p>
                <details className="group">
                  <summary className="inline-flex min-h-11 w-fit cursor-pointer list-none items-center rounded-full border border-[#b42318] px-5 text-[14px] font-bold text-[#b42318] hover:bg-[#fff1ed] [&::-webkit-details-marker]:hidden">
                    {t.annuleren_knop}
                  </summary>
                  <form action={annuleer} className={`${klantMeldingKlassen("fout")} mt-3 flex flex-col items-start gap-3`}>
                    <input type="hidden" name="token" value={a.token} />
                    <p className="m-0">Weet je het zeker? De afspraak wordt direct geannuleerd.</p>
                    <button className="inline-flex min-h-11 items-center rounded-full bg-[#b42318] px-5 text-[14px] font-bold text-white hover:bg-[#9f2a1c]">
                      Ja, annuleer mijn afspraak
                    </button>
                  </form>
                </details>
              </>
            ) : (
              <p className="m-0 text-[15px] text-ink-soft">{vulIn(t.te_laat, uren)}</p>
            )}
          </section>
        )}
      </KlantKaart>
    </KlantPagina>
  );
}
