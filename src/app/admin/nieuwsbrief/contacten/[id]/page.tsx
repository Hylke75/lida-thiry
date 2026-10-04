import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { CONTACT_VELDEN, type Contact } from "@/lib/nieuwsbrief/contacten";
import { alleTags } from "@/lib/nieuwsbrief/beheer";
import { BRON_LABEL } from "@/lib/nieuwsbrief/doelgroep";
import { datumTijd, likeLetterlijk } from "@/lib/nieuwsbrief/contactregels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { statusLabel } from "../../../status";
import { AdminNav, Melding } from "../../../AdminNav";
import { bewaarContact, meldContactAf, meldContactOpnieuwAan, verwijderContact } from "../acties";
import { BevestigKnop, TagInvoer } from "../Invoer";
import { StatusLabel, datum, hoofdknop, invoer, kleineKnop } from "../stijl";

export const dynamic = "force-dynamic";

const PAD = "/admin/nieuwsbrief/contacten";

interface Ontvangen {
  id: string;
  status: string;
  verzonden_op: string | null;
  geopend_op: string | null;
  aantal_geopend: number;
  geklikt_op: string | null;
  aantal_kliks: number;
  afgemeld_op: string | null;
  gebounced_op: string | null;
  aangemaakt_op: string;
  campagne: { id: string; naam: string; soort: string } | null;
}

interface Bestelling {
  id: string;
  status: string;
  toegekend_type: string | null;
  aangemaakt_op: string;
  betaald_op: string | null;
}

const VERZEND_STATUS: Record<string, string> = {
  wachtrij: "In de wachtrij",
  verwerken: "Wordt verstuurd",
  verzonden: "Verzonden",
  mislukt: "Mislukt",
  overgeslagen: "Overgeslagen",
};

function Gegeven({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-black/50 sm:w-40 dark:text-white/50">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function ContactPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; fout?: string }>;
}) {
  await vereisBeheerder();
  const [{ id }, { ok, fout }] = await Promise.all([params, searchParams]);
  if (!UUID_PATROON.test(id)) notFound();
  const supabase = adminClient();
  const { data } = await supabase.from("nb_contacten").select(CONTACT_VELDEN).eq("id", id).maybeSingle();
  const c = data as Contact | null;
  if (!c) notFound();

  const [{ data: verzendingen }, { data: orders }, tags] = await Promise.all([
    supabase
      .from("nb_verzendingen")
      .select(
        "id, status, verzonden_op, geopend_op, aantal_geopend, geklikt_op, aantal_kliks, afgemeld_op, gebounced_op, aangemaakt_op, campagne:nb_campagnes(id, naam, soort)",
      )
      .eq("contact_id", c.id)
      .order("aangemaakt_op", { ascending: false })
      .limit(200),
    supabase
      .from("orders")
      .select("id, status, toegekend_type, aangemaakt_op, betaald_op")
      .ilike("email", likeLetterlijk(c.email))
      .order("aangemaakt_op", { ascending: false })
      .limit(50),
    alleTags().catch(() => [] as string[]),
  ]);
  const ontvangen = (verzendingen ?? []) as unknown as Ontvangen[];
  const bestellingen = (orders ?? []) as Bestelling[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/nieuwsbrief/contacten" />
      <header className="flex flex-col gap-2">
        <Link href={PAD} className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">
          ← Alle contacten
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-all text-2xl font-semibold tracking-tight">{c.email}</h1>
          <StatusLabel status={c.status} />
        </div>
        <p className="text-sm text-black/60 dark:text-white/60">
          {BRON_LABEL[c.bron]} · toegevoegd op {datum(c.aangemaakt_op)}
        </p>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      <section className="flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Gegevens</h2>
        <form action={bewaarContact} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={c.id} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Naam</span>
            <input name="naam" defaultValue={c.naam ?? ""} maxLength={120} className={invoer} />
          </label>
          <div className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Tags</span>
            <TagInvoer name="tags" begin={c.tags} suggesties={tags} />
          </div>
          <div>
            <button className={hoofdknop}>Opslaan</button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Aanmelding en toestemming</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <Gegeven label="Status">
            <StatusLabel status={c.status} />
          </Gegeven>
          <Gegeven label="Toestemming op">{c.toestemming_op ? datumTijd(c.toestemming_op) : "—"}</Gegeven>
          <Gegeven label="Toestemmingstekst">
            {c.toestemming_tekst ? (
              <span className="whitespace-pre-line italic">“{c.toestemming_tekst}”</span>
            ) : (
              "—"
            )}
          </Gegeven>
          <Gegeven label="Bevestigd op">{c.bevestigd_op ? datumTijd(c.bevestigd_op) : "—"}</Gegeven>
          {c.afgemeld_op && <Gegeven label="Afgemeld op">{datumTijd(c.afgemeld_op)}</Gegeven>}
        </dl>

        {c.status === "aangemeld" || c.status === "onbevestigd" ? (
          <form action={meldContactAf}>
            <input type="hidden" name="id" value={c.id} />
            <BevestigKnop bevestiging={`${c.email} afmelden voor de nieuwsbrief?`} className={kleineKnop}>
              Afmelden
            </BevestigKnop>
          </form>
        ) : null}
        {c.status !== "aangemeld" && (
          <form action={meldContactOpnieuwAan} className="flex flex-col gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/15">
            <input type="hidden" name="id" value={c.id} />
            {c.status === "klacht" && (
              <p className="text-red-700 dark:text-red-300">
                Let op: deze persoon heeft de nieuwsbrief als spam gemeld. Meld alleen opnieuw aan als die daar zelf
                uitdrukkelijk om heeft gevraagd.
              </p>
            )}
            {c.status === "gebounced" && (
              <p className="text-black/60 dark:text-white/60">
                Mails naar dit adres kwamen niet aan. Controleer eerst of het adres klopt.
              </p>
            )}
            <label className="flex items-start gap-2">
              <input type="checkbox" name="toestemming" required className="mt-1 accent-accent" />
              <span>Deze persoon heeft (opnieuw) toestemming gegeven om de nieuwsbrief te ontvangen.</span>
            </label>
            <div>
              <button className={kleineKnop}>{c.status === "onbevestigd" ? "Aanmelding bevestigen" : "Opnieuw aanmelden"}</button>
            </div>
          </form>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Ontvangen mails ({ontvangen.length})
        </h2>
        {ontvangen.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Nog geen nieuwsbrieven ontvangen.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart text-sm dark:divide-white/10 dark:border-white/15">
            {ontvangen.map((v) => (
              <li key={v.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">
                    {v.campagne?.naam ?? "Verwijderde campagne"}
                    {v.campagne?.soort === "automatisch" && (
                      <span className="ml-2 text-xs font-normal text-black/50 dark:text-white/50">automatisch</span>
                    )}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    {VERZEND_STATUS[v.status] ?? v.status}
                    {v.verzonden_op ? ` · ${datumTijd(v.verzonden_op)}` : ""}
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5 text-xs">
                  <span className={v.geopend_op ? "text-emerald-700 dark:text-emerald-300" : "text-black/40 dark:text-white/40"}>
                    {v.geopend_op ? `Geopend${v.aantal_geopend > 1 ? ` (${v.aantal_geopend}×)` : ""}` : "Niet geopend"}
                  </span>
                  <span className={v.geklikt_op ? "text-emerald-700 dark:text-emerald-300" : "text-black/40 dark:text-white/40"}>
                    · {v.geklikt_op ? `Geklikt (${v.aantal_kliks}×)` : "Niet geklikt"}
                  </span>
                  {v.afgemeld_op && <span className="text-red-700 dark:text-red-300">· Afgemeld</span>}
                  {v.gebounced_op && <span className="text-red-700 dark:text-red-300">· Onbestelbaar</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-black/40 dark:text-white/40">
          Openen wordt gemeten met een pixel; veel mailprogramma&apos;s blokkeren die, dus het echte aantal ligt meestal hoger.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
          Bestellingen met dit e-mailadres ({bestellingen.length})
        </h2>
        {bestellingen.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">Geen bestellingen.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart text-sm dark:divide-white/10 dark:border-white/15">
            {bestellingen.map((o) => (
              <li key={o.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5">
                <Link href={`/admin/order/${o.id}`} className="font-medium hover:text-accent hover:underline">
                  {datum(o.aangemaakt_op)}
                </Link>
                <span className="text-black/60 dark:text-white/60">
                  {statusLabel(o.status)}
                  {o.toegekend_type ? ` · figuurtype ${o.toegekend_type}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Privacy (AVG)</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Bij een inzageverzoek download je alle gegevens die over dit e-mailadres zijn opgeslagen (nieuwsbrief, ontvangen
          mails, kliks, bestellingen en testresultaten). Bij een verzoek om vergeten te worden verwijder je het contact:
          het e-mailadres verdwijnt dan ook uit de verzendgeschiedenis. Bestellingen blijven bestaan vanwege de wettelijke
          bewaarplicht.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href={`${PAD}/${c.id}/gegevens`} className={kleineKnop}>
            Gegevens downloaden (JSON)
          </a>
          <form action={verwijderContact}>
            <input type="hidden" name="id" value={c.id} />
            <BevestigKnop
              bevestiging={`${c.email} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`}
              className={`${kleineKnop} border-red-300 text-red-700 dark:border-red-800 dark:text-red-300`}
            >
              Contact verwijderen (vergeten)
            </BevestigKnop>
          </form>
        </div>
      </section>
    </main>
  );
}
