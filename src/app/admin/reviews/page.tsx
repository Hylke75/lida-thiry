import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { heeftRecht } from "@/lib/rollen";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import {
  REVIEW_MAX,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUSSEN,
  cijfer,
  isReviewStatus,
  isTestbestelling,
  leesReviewDagen,
  reviewSamenvatting,
  type ReviewStatus,
} from "@/lib/reviews/regels";
import { AdminNav, Melding } from "../AdminNav";
import { BevestigKnop, VerzendKnop } from "../berichten/Knoppen";
import { datumTijd, gevaarKnop, hoofdknop, invoer, kleineKnop } from "../berichten/stijl";
import { beoordeel, bewerk, nodigUit, stuurOpnieuw, verwijder } from "./acties";
import { veiligeZoekterm } from "@/lib/zoeken/regels";

export const dynamic = "force-dynamic";

const PAD = "/admin/reviews";

interface ReviewRij {
  id: string;
  order_id: string | null;
  naam: string | null;
  email: string;
  sterren: number | null;
  tekst: string | null;
  toestemming_publicatie: boolean;
  status: ReviewStatus;
  uitgenodigd_op: string | null;
  ingevuld_op: string | null;
  beoordeeld_op: string | null;
  aangemaakt_op: string;
}

interface OrderKandidaat {
  id: string;
  klantnaam: string;
  email: string;
  afgerond_op: string | null;
  bedrag_cent: number | null;
  kortingscode: string | null;
}

/** Sorteerdatum per tabblad (nieuwste eerst). */
const DATUM: Record<ReviewStatus, (r: ReviewRij) => string> = {
  ingevuld: (r) => r.ingevuld_op ?? r.aangemaakt_op,
  goedgekeurd: (r) => r.beoordeeld_op ?? r.ingevuld_op ?? r.aangemaakt_op,
  afgewezen: (r) => r.beoordeeld_op ?? r.ingevuld_op ?? r.aangemaakt_op,
  uitgenodigd: (r) => r.uitgenodigd_op ?? r.aangemaakt_op,
};

function Sterren({ aantal }: { aantal: number }) {
  return (
    <span className="text-accent" role="img" aria-label={`${aantal} van 5 sterren`}>
      {"★".repeat(aantal)}
      <span className="text-black/20 dark:text-white/20">{"★".repeat(5 - aantal)}</span>
    </span>
  );
}

function Verborgen({ tab, id, naam = "id" }: { tab: ReviewStatus; id: string; naam?: string }) {
  return (
    <>
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name={naam} value={id} />
    </>
  );
}

export default async function ReviewsPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ik = await vereisBeheerder("reviews");
  const magUitnodigen = heeftRecht(ik.rol, "reviews_uitnodigen");
  const zoek = await searchParams;
  const tab: ReviewStatus = isReviewStatus(zoek.tab) ? zoek.tab : "ingevuld";
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;
  const q = typeof zoek.q === "string" ? zoek.q.trim().slice(0, 100) : "";

  const supabase = adminClient();
  const [lijst, dagenWaarde] = await Promise.all([
    supabase
      .from("beoordelingen")
      .select(
        "id, order_id, naam, email, sterren, tekst, toestemming_publicatie, status, uitgenodigd_op, ingevuld_op, beoordeeld_op, aangemaakt_op",
      )
      .not("email", "is", null) // zonder e-mail = verwijderd
      .order("aangemaakt_op", { ascending: false })
      .limit(2000),
    leesInstelling("review_na_dagen").catch(() => null),
  ]);
  const alle = (lijst.data ?? []) as ReviewRij[];
  const naDagen = leesReviewDagen(dagenWaarde);

  const perStatus = new Map<ReviewStatus, ReviewRij[]>(REVIEW_STATUSSEN.map((s) => [s, []]));
  for (const r of alle) perStatus.get(r.status)?.push(r);
  const getoond = [...(perStatus.get(tab) ?? [])].sort((a, b) => DATUM[tab](b).localeCompare(DATUM[tab](a)));

  const ingevuld = alle.filter((r) => r.status !== "uitgenodigd");
  const totaal = reviewSamenvatting(ingevuld.map((r) => r.sterren));
  const opSite = reviewSamenvatting(
    alle.filter((r) => r.status === "goedgekeurd" && r.toestemming_publicatie).map((r) => r.sterren),
  );

  // Handmatig uitnodigen: recente bestellingen met verzonden advies en nog geen review.
  let kandidaten: OrderKandidaat[] = [];
  if (tab === "uitgenodigd") {
    let query = supabase
      .from("orders")
      .select("id, klantnaam, email, afgerond_op, bedrag_cent, kortingscode")
      .eq("status", "advies_verzonden")
      .order("afgerond_op", { ascending: false, nullsFirst: false })
      .limit(100);
    const veilig = veiligeZoekterm(q);
    if (veilig) query = query.or(`klantnaam.ilike.*${veilig}*,email.ilike.*${veilig}*`);
    const { data: orders } = await query;
    const metReview = new Set(alle.map((r) => r.order_id).filter(Boolean));
    kandidaten = ((orders ?? []) as OrderKandidaat[]).filter((o) => !metReview.has(o.id)).slice(0, 25);
  }

  const tabLink = (s: ReviewStatus) => (s === "ingevuld" ? PAD : `${PAD}?tab=${s}`);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/reviews" />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reviews</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Klanten krijgen {naDagen} {naDagen === 1 ? "dag" : "dagen"} na hun advies automatisch een mail met de vraag om
          een review (instelling ‘review_na_dagen’). Goedgekeurde reviews met toestemming staan op de homepage bij
          ‘Ervaringen’. Teksten van de mail en het formulier:{" "}
          <Link href="/admin/teksten/reviews" className="underline underline-offset-4">
            Teksten → Reviews
          </Link>
          .
        </p>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || lijst.error) && <Melding soort="fout">{fout ?? `Reviews laden mislukt: ${lijst.error?.message}`}</Melding>}

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">Op de website</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {opSite.aantal ? `${cijfer(opSite.gemiddelde)} / 5` : "–"}
          </p>
          <p className="text-sm text-black/60 dark:text-white/60">
            {opSite.aantal} goedgekeurde review{opSite.aantal === 1 ? "" : "s"} met toestemming
          </p>
        </div>
        <div className="rounded-lg border border-black/10 bg-kaart p-4 dark:border-white/15">
          <p className="text-sm text-black/60 dark:text-white/60">Alle ingevulde reviews</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {totaal.aantal ? `${cijfer(totaal.gemiddelde)} / 5` : "–"}
          </p>
          <p className="text-sm text-black/60 dark:text-white/60">
            {totaal.aantal} ingevuld · {perStatus.get("uitgenodigd")?.length ?? 0} uitnodiging(en) nog open
          </p>
        </div>
      </section>

      <nav aria-label="Reviews per status" className="flex flex-wrap gap-2 text-sm">
        {REVIEW_STATUSSEN.map((s) => {
          const actief = s === tab;
          const aantal = perStatus.get(s)?.length ?? 0;
          return (
            <Link
              key={s}
              href={tabLink(s)}
              aria-current={actief ? "page" : undefined}
              className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
                actief
                  ? "border-accent/50 bg-accent-zacht"
                  : "border-black/10 bg-kaart hover:border-accent/30 dark:border-white/15"
              }`}
            >
              <span className="text-black/70 dark:text-white/70">{REVIEW_STATUS_LABEL[s]}</span>
              <span
                className={`rounded-full px-1.5 text-xs tabular-nums ${
                  s === "ingevuld" && aantal > 0
                    ? "bg-accent font-semibold text-background"
                    : "text-black/50 dark:text-white/50"
                }`}
              >
                {aantal}
              </span>
            </Link>
          );
        })}
      </nav>

      {tab === "uitgenodigd" ? (
        <>
          {getoond.length === 0 ? (
            <p className="text-sm text-black/50 dark:text-white/50">Geen openstaande uitnodigingen.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
              {getoond.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-3 text-sm">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-medium">{r.naam || "Naam onbekend"}</span>
                    <span className="truncate text-black/50 dark:text-white/50">{r.email}</span>
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {r.uitgenodigd_op ? `Uitgenodigd ${datumTijd(r.uitgenodigd_op)}` : "Nog niet verstuurd"}
                  </span>
                  {magUitnodigen && (
                    <form action={stuurOpnieuw}>
                      <Verborgen tab={tab} id={r.id} />
                      <VerzendKnop bezig="Versturen…" className={kleineKnop}>
                        Opnieuw sturen
                      </VerzendKnop>
                    </form>
                  )}
                  {magUitnodigen && (
                    <form action={verwijder}>
                      <Verborgen tab={tab} id={r.id} />
                      <BevestigKnop
                        bevestiging="Deze uitnodiging verwijderen? De link in de mail werkt dan niet meer en de klant wordt niet opnieuw automatisch uitgenodigd."
                        className={gevaarKnop}
                      >
                        Verwijderen
                      </BevestigKnop>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          <section className="flex flex-col gap-3 rounded-lg border border-dashed border-black/15 p-4 dark:border-white/20">
            <div className="flex flex-col gap-1">
              <h2 className="font-semibold">Zelf uitnodigen</h2>
              <p className="text-sm text-black/60 dark:text-white/60">
                Bestellingen met een verzonden advies die nog geen uitnodiging hebben (nieuwste eerst). Handig voor
                klanten van vóór de automatische uitnodigingen.
              </p>
            </div>
            <form action={PAD} method="get" className="flex flex-wrap gap-2">
              <input type="hidden" name="tab" value="uitgenodigd" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Zoek op naam of e-mailadres"
                aria-label="Zoek een bestelling"
                className={`${invoer} flex-1`}
              />
              <button className={hoofdknop}>Zoeken</button>
            </form>
            {kandidaten.length === 0 ? (
              <p className="text-sm text-black/50 dark:text-white/50">
                {q ? "Geen bestellingen gevonden." : "Alle bestellingen met een verzonden advies zijn al uitgenodigd."}
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
                {kandidaten.map((o) => (
                  <li key={o.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-medium">
                        <Link href={`/admin/order/${o.id}`} className="hover:underline">
                          {o.klantnaam}
                        </Link>
                        {isTestbestelling(o) && (
                          <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/50 dark:bg-white/10 dark:text-white/50">
                            test
                          </span>
                        )}
                      </span>
                      <span className="truncate text-black/50 dark:text-white/50">{o.email}</span>
                    </span>
                    <span className="text-xs text-black/50 dark:text-white/50">
                      {o.afgerond_op ? `Advies ${datumTijd(o.afgerond_op)}` : ""}
                    </span>
                    {magUitnodigen && (
                      <form action={nodigUit}>
                        <Verborgen tab={tab} id={o.id} naam="order_id" />
                        <VerzendKnop bezig="Versturen…" className={kleineKnop}>
                          Nodig uit
                        </VerzendKnop>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : getoond.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          {tab === "ingevuld" ? "Geen nieuwe reviews om te beoordelen." : "Geen reviews met deze status."}
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {getoond.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-lg border border-black/10 bg-kaart p-4 text-sm dark:border-white/15"
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                {r.sterren != null && <Sterren aantal={r.sterren} />}
                <span className="font-medium">{r.naam || "Zonder naam"}</span>
                <span className="truncate text-black/50 dark:text-white/50">{r.email}</span>
                <span className="ml-auto text-xs text-black/50 dark:text-white/50">
                  {r.ingevuld_op ? `Ingevuld ${datumTijd(r.ingevuld_op)}` : ""}
                </span>
              </div>
              <p className="whitespace-pre-line text-black/80 dark:text-white/80">{r.tekst}</p>
              <p
                className={`w-fit rounded-full px-2.5 py-1 text-xs ${
                  r.toestemming_publicatie
                    ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
                }`}
              >
                {r.toestemming_publicatie
                  ? "Mag op de website"
                  : "Geen toestemming voor de website (na goedkeuren alleen hier zichtbaar)"}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                {r.status !== "goedgekeurd" && (
                  <form action={beoordeel}>
                    <Verborgen tab={tab} id={r.id} />
                    <input type="hidden" name="actie" value="goedkeuren" />
                    <VerzendKnop bezig="Bezig…" className={hoofdknop}>
                      Goedkeuren
                    </VerzendKnop>
                  </form>
                )}
                {r.status !== "afgewezen" && (
                  <form action={beoordeel}>
                    <Verborgen tab={tab} id={r.id} />
                    <input type="hidden" name="actie" value="afwijzen" />
                    <VerzendKnop bezig="Bezig…" className={kleineKnop}>
                      Afwijzen
                    </VerzendKnop>
                  </form>
                )}
                {r.status !== "ingevuld" && (
                  <form action={beoordeel}>
                    <Verborgen tab={tab} id={r.id} />
                    <input type="hidden" name="actie" value="terugzetten" />
                    <VerzendKnop bezig="Bezig…" className={kleineKnop}>
                      Terug naar nieuw
                    </VerzendKnop>
                  </form>
                )}
                {magUitnodigen && (
                  <form action={verwijder} className="ml-auto">
                    <Verborgen tab={tab} id={r.id} />
                    <BevestigKnop
                      bevestiging="Deze review definitief verwijderen? Naam, e-mailadres en tekst worden gewist."
                      className={gevaarKnop}
                    >
                      Verwijderen
                    </BevestigKnop>
                  </form>
                )}
              </div>

              <details className="rounded-lg border border-black/10 px-3 py-2 dark:border-white/15">
                <summary className="cursor-pointer text-black/70 dark:text-white/70">Naam of tekst corrigeren</summary>
                <form action={bewerk} className="mt-3 flex flex-col gap-3">
                  <Verborgen tab={tab} id={r.id} />
                  <p className="text-xs text-black/60 dark:text-white/60">
                    Alleen kleine correcties, zoals typefouten. Het blijft de reactie van de klant: de betekenis moet
                    hetzelfde blijven.
                  </p>
                  <label className="flex flex-col gap-1">
                    <span className="text-black/70 dark:text-white/70">Naam zoals getoond</span>
                    <input name="naam" defaultValue={r.naam ?? ""} maxLength={REVIEW_MAX.naam} required className={invoer} />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-black/70 dark:text-white/70">Tekst</span>
                    <textarea
                      name="tekst"
                      defaultValue={r.tekst ?? ""}
                      maxLength={REVIEW_MAX.tekst}
                      rows={5}
                      required
                      className={invoer}
                    />
                  </label>
                  <div>
                    <VerzendKnop bezig="Opslaan…" className={hoofdknop}>
                      Opslaan
                    </VerzendKnop>
                  </div>
                </form>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
