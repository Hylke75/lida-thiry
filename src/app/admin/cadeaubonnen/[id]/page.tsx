import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { heeftRecht } from "@/lib/rollen";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { CADEAUBON_KOLOMMEN, type CadeaubonRij } from "@/lib/cadeaubon/verwerken";
import { datumInNederland, plusDagen } from "@/lib/cadeaubon/regels";
import { formatteerBedrag } from "@/lib/prijs";
import { datum } from "@/lib/datum";
import { FACTUREN } from "@/lib/opslag";
import { AdminNav } from "../../AdminNav";
import { ActieFormulier } from "../../types/ActieFormulier";
import { invoer, invoerBreed, kaart, knop, knopGevaar, knopSecundair, tekstUitleg } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";
import {
  annuleerPlanning,
  betaalTerug,
  verstuur,
  wijzigAdressen,
  wijzigGeldigheid,
  wijzigPlanning,
  zetCodeActief,
} from "./acties";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<CadeaubonRij["status"], string> = {
  aangemaakt: "Wacht op betaling",
  betaald: "Betaald, nog niet verstuurd",
  verzonden: "Verstuurd",
  mislukt: "Betaling mislukt",
  verlopen: "Betaling verlopen",
};

function Regel({ label, waarde }: { label: string; waarde: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-1.5 text-sm dark:border-white/10">
      <span className="text-foreground/70">{label}</span>
      <span className="text-right">{waarde}</span>
    </div>
  );
}

export default async function CadeaubonDetail({ params }: { params: Promise<{ id: string }> }) {
  const ik = await vereisBeheerder("cadeaubonnen");
  const { id } = await params;
  if (!UUID_PATROON.test(id)) notFound();
  const supabase = adminClient();
  const { data } = await supabase.from("cadeaubon_bestellingen").select(CADEAUBON_KOLOMMEN).eq("id", id).maybeSingle();
  const bon = data as CadeaubonRij | null;
  if (!bon) notFound();

  const { data: code } = bon.kortingscode_id
    ? await supabase
        .from("kortingscodes")
        .select("code, geldig_tot, aantal_gebruikt, max_gebruik, actief")
        .eq("id", bon.kortingscode_id)
        .maybeSingle()
    : { data: null };
  const { data: gebruik } = code
    ? await supabase.from("orders").select("id, klantnaam").eq("kortingscode", code.code).limit(5)
    : { data: [] };
  const { data: cnData } = await supabase
    .from("creditnotas")
    .select("id, nummer, bedrag_cent, reden, pad, aangemaakt_op, gemaild_op")
    .eq("cadeaubon_id", id)
    .order("aangemaakt_op", { ascending: true });
  const creditnotas = (cnData ?? []) as {
    id: string;
    nummer: string;
    bedrag_cent: number;
    reden: string | null;
    pad: string | null;
    aangemaakt_op: string;
    gemaild_op: string | null;
  }[];
  const paden = [bon.factuur_pad, ...creditnotas.map((c) => c.pad)].filter((p): p is string => Boolean(p));
  const urls = new Map<string, string>();
  if (paden.length) {
    const { data: u } = await supabase.storage.from(FACTUREN).createSignedUrls(paden, 3600);
    for (const x of u ?? []) if (x.path && x.signedUrl) urls.set(x.path, x.signedUrl);
  }

  const valuta = bon.valuta || "EUR";
  const betaald = bon.status === "betaald" || bon.status === "verzonden";
  const alTerug = bon.terugbetaald_cent ?? 0;
  const rest = Math.max(0, bon.bedrag_cent - alTerug);
  const gepland = bon.status === "betaald" && bon.bezorging === "ontvanger";
  const vandaag = datumInNederland(new Date());
  const geldigTot = code?.geldig_tot ? datumInNederland(new Date(code.geldig_tot)) : "";
  const magTerugbetalen = heeftRecht(ik.rol, "terugbetalen");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/cadeaubonnen" />
      <AdminKop
        terug={{ href: "/admin/cadeaubonnen", label: "Terug naar cadeaubonnen" }}
        titel={`Cadeaubon ${formatteerBedrag(bon.bedrag_cent, valuta)}`}
        beschrijving={`Gekocht door ${bon.koper_naam} op ${datum(bon.aangemaakt_op)}`}
      />

      <section className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
        <Regel label="Status" waarde={STATUS_LABEL[bon.status]} />
        <Regel label="Koper" waarde={`${bon.koper_naam} (${bon.koper_email})`} />
        <Regel
          label="Bezorging"
          waarde={
            bon.bezorging === "ontvanger"
              ? `Naar ${bon.ontvanger_naam ?? "–"} (${bon.ontvanger_email ?? "–"})${bon.verzend_op ? ` op ${datum(bon.verzend_op)}` : ""}`
              : "Naar de koper"
          }
        />
        {bon.betaald_op && <Regel label="Betaald" waarde={datum(bon.betaald_op)} />}
        {bon.verzonden_op && <Regel label="Verstuurd" waarde={datum(bon.verzonden_op)} />}
        <Regel
          label="Factuur"
          waarde={
            bon.factuur_pad && urls.get(bon.factuur_pad) ? (
              <a href={urls.get(bon.factuur_pad)} className="text-accent underline underline-offset-2">
                {bon.factuurnummer ?? "Download"}
              </a>
            ) : (
              (bon.factuurnummer ?? "–")
            )
          }
        />
        <Regel
          label="Code"
          waarde={
            code ? (
              <>
                <span className="font-mono">{code.code}</span> · {code.aantal_gebruikt}
                {code.max_gebruik !== null ? ` / ${code.max_gebruik}` : ""} gebruikt
                {code.geldig_tot ? ` · t/m ${datum(code.geldig_tot)}` : ""}
                {!code.actief ? " · geblokkeerd" : ""}
              </>
            ) : (
              "Nog geen code"
            )
          }
        />
        {(gebruik ?? []).map((o) => (
          <Regel
            key={o.id}
            label="Gebruikt bij"
            waarde={
              <Link href={`/admin/order/${o.id}`} className="underline underline-offset-2">
                bestelling van {o.klantnaam}
              </Link>
            }
          />
        ))}
        {alTerug > 0 && <Regel label="Terugbetaald" waarde={formatteerBedrag(alTerug, valuta)} />}
        {creditnotas.map((c) => (
          <Regel
            key={c.id}
            label={`Creditnota ${datum(c.aangemaakt_op)}`}
            waarde={
              <>
                {c.pad && urls.get(c.pad) ? (
                  <a href={urls.get(c.pad)} className="text-accent underline underline-offset-2">
                    {c.nummer}
                  </a>
                ) : (
                  c.nummer
                )}{" "}
                (− {formatteerBedrag(c.bedrag_cent, valuta)}){c.gemaild_op ? " · gemaild" : ""}
              </>
            }
          />
        ))}
      </section>

      {betaald && (
        <section className={kaart}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Versturen</h2>
          <div className="flex flex-wrap gap-3">
            <ActieFormulier actie={verstuur} className="flex flex-col gap-1">
              <input type="hidden" name="id" value={bon.id} />
              <button className={knopSecundair}>{bon.status === "verzonden" ? "Bon opnieuw versturen" : "Bon nu versturen"}</button>
            </ActieFormulier>
            {bon.bezorging === "ontvanger" && (
              <ActieFormulier actie={verstuur} className="flex flex-col gap-1">
                <input type="hidden" name="id" value={bon.id} />
                <input type="hidden" name="kopie" value="1" />
                <button className={knopSecundair}>Kopie naar koper</button>
              </ActieFormulier>
            )}
          </div>
          {gepland && (
            <>
              <ActieFormulier actie={wijzigPlanning} className="flex flex-wrap items-end gap-3 text-sm">
                <input type="hidden" name="id" value={bon.id} />
                <label className="flex flex-col gap-1">
                  <span>Geplande verzenddatum</span>
                  <input
                    type="date"
                    name="verzend_op"
                    required
                    min={plusDagen(vandaag, 1)}
                    defaultValue={bon.verzend_op ?? ""}
                    className={invoer}
                  />
                </label>
                <button className={knopSecundair}>Datum wijzigen</button>
              </ActieFormulier>
              <ActieFormulier
                actie={annuleerPlanning}
                bevestig="De bon gaat dan nu naar de koper in plaats van (later) naar de ontvanger. Doorgaan?"
                className="flex flex-col gap-1 text-sm"
              >
                <input type="hidden" name="id" value={bon.id} />
                <button className={`w-fit ${knopSecundair}`}>Planning annuleren</button>
                <span className={tekstUitleg}>
                  De bon gaat dan niet naar de ontvanger, maar meteen naar de koper, die hem zelf kan doorgeven.
                </span>
              </ActieFormulier>
            </>
          )}
        </section>
      )}

      {code && (
        <section className={kaart}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">Code</h2>
          <ActieFormulier actie={zetCodeActief} className="flex flex-wrap items-center gap-3 text-sm">
            <input type="hidden" name="id" value={bon.id} />
            <input type="hidden" name="actief" value={code.actief ? "0" : "1"} />
            <span className="text-foreground/70">{code.actief ? "De code werkt." : "De code is geblokkeerd."}</span>
            <button className={code.actief ? knopGevaar : knopSecundair}>{code.actief ? "Blokkeren" : "Vrijgeven"}</button>
          </ActieFormulier>
          <ActieFormulier actie={wijzigGeldigheid} className="flex flex-wrap items-end gap-3 text-sm">
            <input type="hidden" name="id" value={bon.id} />
            <label className="flex flex-col gap-1">
              <span>Geldig tot en met</span>
              <input type="date" name="geldig_tot" required min={vandaag} defaultValue={geldigTot} className={invoer} />
            </label>
            <button className={knopSecundair}>Geldigheid opslaan</button>
          </ActieFormulier>
        </section>
      )}

      <details className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
        <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Namen en e-mailadressen corrigeren
        </summary>
        <ActieFormulier actie={wijzigAdressen} bewaakWijzigingen className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input type="hidden" name="id" value={bon.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span>Naam koper</span>
            <input name="koper_naam" required defaultValue={bon.koper_naam} className={invoerBreed} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>E-mail koper</span>
            <input name="koper_email" type="email" required defaultValue={bon.koper_email} className={invoerBreed} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>Naam ontvanger</span>
            <input name="ontvanger_naam" defaultValue={bon.ontvanger_naam ?? ""} className={invoerBreed} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>E-mail ontvanger</span>
            <input name="ontvanger_email" type="email" defaultValue={bon.ontvanger_email ?? ""} className={invoerBreed} />
          </label>
          <div className="sm:col-span-2">
            <button className={knop}>Opslaan</button>
          </div>
        </ActieFormulier>
      </details>

      {magTerugbetalen && betaald && rest > 0 && (
        <details className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
          <summary className="cursor-pointer text-sm font-semibold uppercase tracking-wide text-foreground/70">
            Terugbetalen
          </summary>
          <ActieFormulier
            actie={betaalTerug}
            bevestig="Weet je zeker dat je wilt terugbetalen? Dit kan niet ongedaan worden gemaakt."
            className="mt-4 flex flex-col gap-3 text-sm"
          >
            <input type="hidden" name="id" value={bon.id} />
            <p className={tekstUitleg}>
              Betaald {formatteerBedrag(bon.bedrag_cent, valuta)}
              {alTerug > 0 ? `, al terugbetaald ${formatteerBedrag(alTerug, valuta)}` : ""}; nog terug te betalen:{" "}
              {formatteerBedrag(rest, valuta)}. Het bedrag gaat via Mollie terug naar de koper.
            </p>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Hoeveel</legend>
              <label className="flex items-center gap-2">
                <input type="radio" name="omvang" value="volledig" defaultChecked />
                Alles ({formatteerBedrag(rest, valuta)})
              </label>
              <label className="flex flex-wrap items-center gap-2">
                <input type="radio" name="omvang" value="deel" />
                Een deel: €
                <input name="bedrag" inputMode="decimal" placeholder="10,00" aria-label="Bedrag in euro" className={`${invoer} w-28`} />
              </label>
            </fieldset>
            <label className="flex flex-col gap-1">
              <span>Reden (komt op de creditnota en bij Mollie)</span>
              <input name="reden" maxLength={200} className={invoerBreed} />
            </label>
            <label className="flex items-start gap-2">
              <input type="checkbox" name="toegang_behouden" value="1" className="mt-1" />
              <span>
                Code laten werken
                <span className={`block ${tekstUitleg}`}>
                  Alleen van belang bij een volledige terugbetaling: zonder vinkje wordt de code geblokkeerd.
                </span>
              </span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="mailen" value="1" defaultChecked />
              Creditnota naar {bon.koper_email} mailen
            </label>
            <div>
              <button className={knopGevaar}>Terugbetalen</button>
            </div>
          </ActieFormulier>
        </details>
      )}
    </main>
  );
}
