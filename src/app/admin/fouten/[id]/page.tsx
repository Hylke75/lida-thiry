import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BRON_LABEL, GEMELD_BIJ, type FoutBron } from "@/lib/fouten/regels";
import type { FoutRij } from "@/lib/fouten/registreer";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { AdminNav, Melding } from "../../AdminNav";
import { BevestigKnop } from "../../berichten/Knoppen";
import { datumTijd, gevaarKnop, hoofdknop, kleineKnop } from "../../berichten/stijl";
import { heropen, markeerOpgelost, verwijderFout } from "../acties";
import { BRON_KLEUR } from "../stijl";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fout · Beheer" };

const PAD = "/admin/fouten";

function Gegeven({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-black/50 sm:w-36 dark:text-white/50">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function FoutPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("fouten");
  const { id } = await params;
  if (!UUID_PATROON.test(id)) notFound();
  const zoek = await searchParams;
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const foutMelding = typeof zoek.fout === "string" ? zoek.fout : null;

  const { data, error } = await adminClient().from("fouten_log").select("*").eq("id", id).maybeSingle();
  if (error) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
        <AdminNav actief="/admin/fouten" />
        <Melding soort="fout">Fout laden mislukt: {error.message}</Melding>
      </main>
    );
  }
  if (!data) notFound();
  const f = data as FoutRij;
  const details = Object.fromEntries(Object.entries(f.details ?? {}).filter(([k]) => k !== GEMELD_BIJ));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/fouten" />
      <Link href={PAD} className="text-sm text-black/60 underline underline-offset-4 dark:text-white/60">
        ← Alle fouten
      </Link>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {foutMelding && <Melding soort="fout">{foutMelding}</Melding>}

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className={`rounded-full px-2 py-0.5 text-xs ${BRON_KLEUR[f.bron] ?? BRON_KLEUR.test}`}>
            {BRON_LABEL[f.bron as FoutBron] ?? f.bron}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              f.opgelost
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-accent-zacht text-accent"
            }`}
          >
            {f.opgelost ? "Opgelost" : "Open"}
          </span>
        </div>
        <h1 className="text-xl font-semibold tracking-tight break-words">{f.bericht}</h1>
      </header>

      <dl className="flex flex-col gap-2 rounded-lg border border-black/10 bg-kaart p-4 text-sm dark:border-white/15">
        <Gegeven label="Aantal keer">{f.aantal}×</Gegeven>
        <Gegeven label="Eerst gezien">{datumTijd(f.eerst_op)}</Gegeven>
        <Gegeven label="Laatst gezien">{datumTijd(f.laatst_op)}</Gegeven>
        <Gegeven label="Pagina">{f.pad ? <code className="font-mono text-xs">{f.pad}</code> : "—"}</Gegeven>
        <Gegeven label="Foutcode (digest)">
          {f.digest ? <code className="font-mono text-xs select-all">{f.digest}</code> : "—"}
        </Gegeven>
        <Gegeven label="Laatste mail">{f.gemeld_op ? datumTijd(f.gemeld_op) : "—"}</Gegeven>
        <Gegeven label="Vingerafdruk">
          <code className="font-mono text-xs text-black/50 dark:text-white/50">{f.vingerafdruk}</code>
        </Gegeven>
      </dl>

      {Object.keys(details).length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">Details</h2>
          <pre className="overflow-x-auto rounded-lg border border-black/10 bg-kaart p-3 font-mono text-xs whitespace-pre-wrap break-words dark:border-white/15">
            {JSON.stringify(details, null, 2)}
          </pre>
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Stack trace</h2>
        {f.stack ? (
          <pre className="max-h-[32rem] overflow-auto rounded-lg border border-black/10 bg-kaart p-3 font-mono text-xs dark:border-white/15">
            {f.stack}
          </pre>
        ) : (
          <p className="text-sm text-black/50 dark:text-white/50">Geen stack trace beschikbaar.</p>
        )}
        <p className="text-xs text-black/50 dark:text-white/50">
          Meer context staat in de serverlogs (Vercel → Logs); zoek daar op de foutcode of het tijdstip.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <form action={f.opgelost ? heropen : markeerOpgelost}>
          <input type="hidden" name="id" value={f.id} />
          <button className={hoofdknop}>{f.opgelost ? "Heropen" : "Markeer als opgelost"}</button>
        </form>
        <form action={verwijderFout}>
          <input type="hidden" name="id" value={f.id} />
          <BevestigKnop bevestiging="Deze fout verwijderen? Komt hij terug, dan verschijnt hij als nieuwe fout." className={gevaarKnop}>
            Verwijderen
          </BevestigKnop>
        </form>
        <Link href={PAD} className={kleineKnop}>
          Terug naar de lijst
        </Link>
      </div>
    </main>
  );
}
