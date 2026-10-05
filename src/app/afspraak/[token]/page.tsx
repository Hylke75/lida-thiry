import type { Metadata } from "next";
import Link from "next/link";
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

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12">
      <div className="flex flex-col gap-6 rounded-2xl bg-kaart p-8 shadow-sm ring-1 ring-foreground/5">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t.titel}</h1>
          <p className="text-sm text-foreground/60">Status: {STATUS_LABEL[a.status]}</p>
        </header>

        {zoek.fout && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {zoek.fout}
          </p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-foreground/60">Afspraak</dt>
          <dd className="font-medium">{soort?.naam ?? "Afspraak"}</dd>
          <dt className="text-foreground/60">Datum</dt>
          <dd className={a.status === "geannuleerd" ? "line-through" : ""}>{datumLabel(a.start_op)}</dd>
          <dt className="text-foreground/60">Tijd</dt>
          <dd className={a.status === "geannuleerd" ? "line-through" : ""}>
            {tijdLabel(a.start_op)} – {tijdLabel(a.eind_op)} ({duurLabel(duur)})
          </dd>
          {locatie && (
            <>
              <dt className="text-foreground/60">Locatie</dt>
              <dd>{locatie}</dd>
            </>
          )}
          {a.aanbetaling_cent > 0 && (
            <>
              <dt className="text-foreground/60">Aanbetaling</dt>
              <dd>
                {bedragLabel(a.aanbetaling_cent)}
                {a.betaald_op ? " (betaald)" : ""}
              </dd>
            </>
          )}
          <dt className="text-foreground/60">Naam</dt>
          <dd>{a.naam}</dd>
        </dl>

        {a.status === "wacht_op_betaling" && (
          <>
            <p role="status" className="rounded-xl bg-accent-zacht px-4 py-3 text-sm">
              {t.betaling_bezig}
            </p>
            <AutoVernieuwen />
          </>
        )}

        {a.status === "aangevraagd" && <p className="rounded-xl bg-accent-zacht px-4 py-3 text-sm">{t.aangevraagd}</p>}

        {a.status === "geannuleerd" && (
          <div className="flex flex-col gap-4">
            <p role="status" className="rounded-xl bg-accent-zacht px-4 py-3 text-sm">
              {betalingMislukt && !zoek.geannuleerd ? t.betaling_mislukt : t.geannuleerd}
            </p>
            <Link
              href="/afspraak"
              className="w-fit rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-background shadow-sm hover:opacity-90"
            >
              Nieuwe afspraak maken
            </Link>
          </div>
        )}

        {a.status === "bevestigd" && !voorbij && (
          <a
            href={`/afspraak/${a.token}/ics`}
            className="w-fit rounded-full border border-foreground/15 px-5 py-2 text-sm font-medium hover:border-accent"
          >
            {t.agenda_knop}
          </a>
        )}

        {(a.status === "bevestigd" || a.status === "aangevraagd") && !voorbij && (
          <section className="flex flex-col gap-3 border-t border-foreground/10 pt-5">
            {kanAnnuleren ? (
              <>
                <p className="text-sm text-foreground/70">{vulIn(t.annuleren_uitleg, uren)}</p>
                <details className="group">
                  <summary className="w-fit cursor-pointer list-none rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40 [&::-webkit-details-marker]:hidden">
                    {t.annuleren_knop}
                  </summary>
                  <form action={annuleer} className="mt-3 flex flex-col gap-2 rounded-xl bg-red-50 p-4 text-sm dark:bg-red-950/30">
                    <input type="hidden" name="token" value={a.token} />
                    <p>Weet je het zeker? De afspraak wordt direct geannuleerd.</p>
                    <button className="w-fit rounded-full bg-red-700 px-5 py-2 font-medium text-white hover:opacity-90">
                      Ja, annuleer mijn afspraak
                    </button>
                  </form>
                </details>
              </>
            ) : (
              <p className="text-sm text-foreground/70">{vulIn(t.te_laat, uren)}</p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
