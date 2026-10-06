import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { AdminNav } from "../../AdminNav";
import { AFSPRAAK_VELDEN, afspraakInstellingen, haalSoort, type AfspraakRij } from "@/lib/afspraken/data";
import { bedragLabel, duurLabel, geldigeUuid, MAX, STATUS_LABEL, toegestaneOvergangen, type AfspraakStatus } from "@/lib/afspraken/regels";
import { datumLabel, tijdLabel } from "@/lib/datum";
import { bewaarNotitie, koppelAanAdresboek, stuurBevestigingOpnieuw, verwijderAfspraak, wijzigStatus } from "../acties";
import { Meldingen, NAV_AFSPRAKEN, StatusLabel } from "../onderdelen";
import { invoer, kaart, knop, knopGevaar, knopSecundair, tekstFout, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";
import { heeftRecht } from "@/lib/rollen";
import { ActieFormulier } from "../../types/ActieFormulier";
import { betaalAanbetalingTerugActie } from "./terugbetalen";

export const dynamic = "force-dynamic";

const PAD = "/admin/afspraken";

const KNOP_LABEL: Record<AfspraakStatus, string> = {
  wacht_op_betaling: "Wacht op betaling",
  aangevraagd: "Terug naar aanvraag",
  bevestigd: "Bevestigen",
  geannuleerd: "Annuleren",
  afgerond: "Afgerond",
  niet_verschenen: "Niet verschenen",
};

function tijdstip(iso: string | null): string {
  return iso ? `${datumLabel(iso)} ${tijdLabel(iso)}` : "—";
}

export default async function AfspraakDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; fout?: string }>;
}) {
  const ik = await vereisBeheerder("afspraken");
  const { id } = await params;
  const { ok, fout } = await searchParams;
  if (!geldigeUuid(id)) notFound();
  const { data } = await adminClient().from("afspraken").select(AFSPRAAK_VELDEN).eq("id", id).maybeSingle();
  if (!data) notFound();
  const a = data as AfspraakRij;
  const [soort, inst] = await Promise.all([a.soort_id ? haalSoort(a.soort_id).catch(() => null) : null, afspraakInstellingen()]);
  const duur = Math.round((Date.parse(a.eind_op) - Date.parse(a.start_op)) / 60_000);
  const gestart = Date.parse(a.start_op) <= new Date().getTime();
  const overgangen = toegestaneOvergangen(a.status, gestart);
  // Terugbetaald deel van de aanbetaling (kolom uit de migratie verkoop_beheer; zonder: 0).
  const { data: terugRij } = await adminClient().from("afspraken").select("terugbetaald_cent").eq("id", id).maybeSingle();
  const alTerug = Number((terugRij as { terugbetaald_cent?: number } | null)?.terugbetaald_cent ?? 0);
  const restAanbetaling = a.betaald_op && a.mollie_payment_id ? Math.max(0, a.aanbetaling_cent - alTerug) : 0;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief={NAV_AFSPRAKEN} />
      <AdminKop
        terug={{ href: PAD, label: "Alle afspraken" }}
        titel={a.naam}
        beschrijving={
          <>
            {soort?.naam ?? "Afspraak"} · <span className="first-letter:uppercase">{datumLabel(a.start_op)}</span> · {tijdLabel(a.start_op)}–
            {tijdLabel(a.eind_op)}
          </>
        }
        acties={<StatusLabel status={a.status} />}
      />

      <Meldingen ok={ok} fout={fout} />

      <section className={kaart}>
        <h2 className="font-semibold">Gegevens</h2>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          <dt className={tekstZacht}>E-mail</dt>
          <dd>
            <a href={`mailto:${a.email}`} className="text-accent underline underline-offset-4">
              {a.email}
            </a>
          </dd>
          <dt className={tekstZacht}>Telefoon</dt>
          <dd>{a.telefoon ? <a href={`tel:${a.telefoon.replace(/[^0-9+]/g, "")}`}>{a.telefoon}</a> : "—"}</dd>
          <dt className={tekstZacht}>Soort</dt>
          <dd>
            {soort?.naam ?? "(verwijderd)"} · {duurLabel(duur)}
            {soort?.locatie ? ` · ${soort.locatie}` : soort?.online ? " · online" : ""}
          </dd>
          <dt className={tekstZacht}>Aanbetaling</dt>
          <dd>
            {a.aanbetaling_cent > 0
              ? `${bedragLabel(a.aanbetaling_cent)} — ${a.betaald_op ? `betaald op ${tijdstip(a.betaald_op)}` : "niet betaald"}`
              : "geen"}
            {a.mollie_payment_id && <span className={`block text-xs ${tekstZacht}`}>Mollie: {a.mollie_payment_id}</span>}
          </dd>
          <dt className={tekstZacht}>Herinnering</dt>
          <dd>{a.herinnering_op ? `verstuurd op ${tijdstip(a.herinnering_op)}` : "nog niet verstuurd"}</dd>
          <dt className={tekstZacht}>Geboekt op</dt>
          <dd>{tijdstip(a.aangemaakt_op)}</dd>
          <dt className={tekstZacht}>Adresboek</dt>
          <dd>
            {a.relatie_id ? (
              <Link href={`/admin/adresboek/${a.relatie_id}`} className="text-accent underline underline-offset-4">
                Bekijk relatie
              </Link>
            ) : (
              <form action={koppelAanAdresboek}>
                <input type="hidden" name="id" value={a.id} />
                <button className="text-accent underline underline-offset-4">Koppelen aan adresboek</button>
              </form>
            )}
          </dd>
          <dt className={tekstZacht}>Klantlink</dt>
          <dd>
            <Link href={`/afspraak/${a.token}`} className="break-all text-accent underline underline-offset-4" target="_blank">
              /afspraak/{a.token.slice(0, 10)}…
            </Link>
          </dd>
        </dl>
        {a.opmerking && (
          <div className="flex flex-col gap-1 text-sm">
            <p className={tekstZacht}>Opmerking van de klant</p>
            <p className="rounded-lg bg-black/[0.03] px-4 py-3 whitespace-pre-line dark:bg-white/[0.05]">{a.opmerking}</p>
          </div>
        )}
      </section>

      {overgangen.length > 0 && (
        <section className={kaart}>
          <h2 className="font-semibold">Status wijzigen</h2>
          <div className="flex flex-col gap-4">
            {overgangen
              .filter((s) => s !== "geannuleerd")
              .map((s) => (
                <form key={s} action={wijzigStatus} className="flex flex-wrap items-center gap-3 text-sm">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value={s} />
                  <button className={s === "bevestigd" ? knop : knopSecundair}>{KNOP_LABEL[s]}</button>
                  {s === "bevestigd" && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" name="mail" defaultChecked className="accent-accent" />
                      Stuur de klant een bevestiging (met agendabestand)
                    </label>
                  )}
                </form>
              ))}
            {overgangen.includes("geannuleerd") && (
              <details className="rounded-lg border border-red-200 p-3 text-sm dark:border-red-900">
                <summary className={`cursor-pointer font-medium ${tekstFout}`}>Afspraak annuleren…</summary>
                <form action={wijzigStatus} className="mt-3 flex flex-col gap-3">
                  <input type="hidden" name="id" value={a.id} />
                  <input type="hidden" name="status" value="geannuleerd" />
                  <label className="flex flex-col gap-1">
                    <span className={tekstZacht}>Toelichting voor de klant (optioneel)</span>
                    <textarea name="reden" rows={3} maxLength={MAX.reden} className={invoer} />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" name="mail" defaultChecked className="accent-accent" />
                    Stuur de klant een annuleringsmail
                  </label>
                  {a.aanbetaling_cent > 0 && a.betaald_op && (
                    <p className={`text-xs ${tekstZacht}`}>
                      Er is een aanbetaling gedaan. Terugbetalen kan hieronder (of in het Mollie-dashboard).
                    </p>
                  )}
                  <button className="w-fit rounded-full bg-red-700 px-5 py-2 text-sm font-medium text-white hover:opacity-90">
                    Annuleren
                  </button>
                </form>
              </details>
            )}
            {a.status === "bevestigd" && !gestart && (
              <p className={`text-xs ${tekstZacht}`}>‘Afgerond’ en ‘Niet verschenen’ kun je kiezen zodra de afspraak is begonnen.</p>
            )}
          </div>
        </section>
      )}

      {a.status === "bevestigd" && (
        <form action={stuurBevestigingOpnieuw} className="flex items-center gap-3 text-sm">
          <input type="hidden" name="id" value={a.id} />
          <button className={knopSecundair}>Bevestiging opnieuw sturen</button>
          <span className={tekstZacht}>De klant kan tot {inst.minVoorafUren} uur vooraf zelf annuleren.</span>
        </form>
      )}

      {heeftRecht(ik.rol, "terugbetalen") && (restAanbetaling > 0 || alTerug > 0) && (
        <section className={kaart}>
          <h2 className="font-semibold">Aanbetaling terugbetalen</h2>
          <p className={`text-sm ${tekstZacht}`}>
            Aanbetaald {bedragLabel(a.aanbetaling_cent)}
            {alTerug > 0 ? `, al terugbetaald ${bedragLabel(alTerug)}` : ""}. Het bedrag gaat via Mollie terug. Voor een
            aanbetaling is er geen factuur, dus ook geen creditnota.
          </p>
          {restAanbetaling > 0 && (
            <ActieFormulier
              actie={betaalAanbetalingTerugActie}
              bevestig="Weet je zeker dat je wilt terugbetalen? Dit kan niet ongedaan worden gemaakt."
              className="flex flex-col gap-3 text-sm"
            >
              <input type="hidden" name="id" value={a.id} />
              <label className="flex items-center gap-2">
                <input type="radio" name="omvang" value="volledig" defaultChecked />
                Alles ({bedragLabel(restAanbetaling)})
              </label>
              <label className="flex flex-wrap items-center gap-2">
                <input type="radio" name="omvang" value="deel" />
                Een deel: €
                <input name="bedrag" inputMode="decimal" placeholder="10,00" aria-label="Bedrag in euro" className={`${invoer} w-28`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className={tekstZacht}>Reden (zichtbaar bij Mollie)</span>
                <input name="reden" maxLength={200} className={invoer} />
              </label>
              <button className={`${knopGevaar} w-fit`}>Terugbetalen</button>
            </ActieFormulier>
          )}
        </section>
      )}

      <section className={kaart}>
        <h2 className="font-semibold">Interne notitie</h2>
        <form action={bewaarNotitie} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={a.id} />
          <textarea name="notitie" rows={4} defaultValue={a.notitie} maxLength={MAX.notitie} className={invoer} aria-label="Interne notitie" />
          <button className={`${knop} w-fit`}>Notitie opslaan</button>
        </form>
        <p className={`text-xs ${tekstZacht}`}>Alleen zichtbaar in het beheer. Status nu: {STATUS_LABEL[a.status]}.</p>
      </section>

      <details className="text-sm">
        <summary className={`cursor-pointer ${tekstZacht}`}>Afspraak verwijderen</summary>
        <form action={verwijderAfspraak} className="mt-2 flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={a.id} />
          <span className={tekstZacht}>Verwijdert de afspraak definitief (zonder mail). Annuleren is meestal beter.</span>
          <button className={knopGevaar}>
            Definitief verwijderen
          </button>
        </form>
      </details>
    </main>
  );
}
