import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { AdminNav } from "../AdminNav";
import { AFSPRAAK_STATUSSEN, isAfspraakStatus, STATUS_LABEL, type AfspraakStatus } from "@/lib/afspraken/regels";
import { haalBeschikbaarheid, haalBlokkades } from "@/lib/afspraken/data";
import { vensters } from "@/lib/afspraken/slots";
import {
  datumKortLabel,
  datumLabel,
  datumPlusDagen,
  leesDatum,
  maandagVan,
  naarAmsterdam,
  tijdLabel,
  vandaagAmsterdam,
  vanAmsterdam,
} from "@/lib/datum";
import { Meldingen, NAV_AFSPRAKEN, StatusLabel } from "./onderdelen";
import { kaart, knop, knopSecundair, tekstFout, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const PAD = "/admin/afspraken";

interface LijstRij {
  id: string;
  naam: string;
  email: string;
  start_op: string;
  eind_op: string;
  status: AfspraakStatus;
  aanbetaling_cent: number;
  betaald_op: string | null;
  afspraak_soorten: { naam: string } | { naam: string }[] | null;
}

const soortNaam = (r: LijstRij) => (Array.isArray(r.afspraak_soorten) ? r.afspraak_soorten[0]?.naam : r.afspraak_soorten?.naam) ?? "Afspraak";

type Weergave = "komend" | "voorbij" | "week";
type Zoek = Promise<{ weergave?: string; status?: string; week?: string; ok?: string; fout?: string }>;

function tabUrl(w: Weergave, extra: Record<string, string | undefined> = {}): string {
  const p = new URLSearchParams({ weergave: w });
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return `${PAD}?${p.toString()}`;
}

export default async function AfsprakenPagina({ searchParams }: { searchParams: Zoek }) {
  await vereisBeheerder("afspraken");
  const zoek = await searchParams;
  const weergave: Weergave = zoek.weergave === "voorbij" || zoek.weergave === "week" ? zoek.weergave : "komend";
  const status = isAfspraakStatus(zoek.status) ? zoek.status : undefined;
  const nu = new Date();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief={NAV_AFSPRAKEN} />
      <AdminKop
        titel="Afspraken"
        beschrijving={
          <>
            Klanten boeken via <Link href="/afspraak" className="underline underline-offset-4">/afspraak</Link> of het blok{" "}
            <code>{"{afspraak}"}</code> op een pagina. Soorten, beschikbaarheid en vrije dagen stel je in bij{" "}
            <Link href={`${PAD}/instellingen`} className="underline underline-offset-4">
              Instellingen
            </Link>
            .
          </>
        }
        acties={
          <>
            <Link href={`${PAD}/instellingen`} className={knopSecundair}>
              Instellingen
            </Link>
            <Link href={`${PAD}/nieuw`} className={knop}>
              Afspraak inplannen
            </Link>
          </>
        }
      />

      <Meldingen ok={zoek.ok} fout={zoek.fout} />

      <nav aria-label="Weergave" className="flex flex-wrap gap-1 text-sm">
        {(
          [
            ["komend", "Komend"],
            ["voorbij", "Voorbij"],
            ["week", "Week"],
          ] as const
        ).map(([w, label]) => (
          <Link
            key={w}
            href={tabUrl(w, w === "week" ? {} : { status })}
            aria-current={weergave === w ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 ${weergave === w ? "bg-accent-zacht font-medium text-accent" : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {weergave === "week" ? <Week week={zoek.week} nu={nu} /> : <Lijst weergave={weergave} status={status} nu={nu} />}
    </main>
  );
}

async function Lijst({ weergave, status, nu }: { weergave: "komend" | "voorbij"; status?: AfspraakStatus; nu: Date }) {
  let q = adminClient()
    .from("afspraken")
    .select("id, naam, email, start_op, eind_op, status, aanbetaling_cent, betaald_op, afspraak_soorten(naam)")
    .limit(300);
  q = weergave === "komend" ? q.gte("eind_op", nu.toISOString()).order("start_op") : q.lt("eind_op", nu.toISOString()).order("start_op", { ascending: false });
  if (status) q = q.eq("status", status);
  else if (weergave === "komend") q = q.neq("status", "geannuleerd");
  const { data, error } = await q;
  const rijen = (data ?? []) as unknown as LijstRij[];

  // Groeperen per Nederlandse dag.
  const perDag = new Map<string, LijstRij[]>();
  for (const r of rijen) {
    const d = naarAmsterdam(new Date(r.start_op)).datum;
    perDag.set(d, [...(perDag.get(d) ?? []), r]);
  }

  return (
    <section className="flex flex-col gap-4">
      <form className="flex flex-wrap items-center gap-2 text-sm" action={PAD}>
        <input type="hidden" name="weergave" value={weergave} />
        <label className="flex items-center gap-2">
          <span className={tekstZacht}>Status</span>
          <select name="status" defaultValue={status ?? ""} className="rounded-lg border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/20">
            <option value="">{weergave === "komend" ? "Alle (behalve geannuleerd)" : "Alle"}</option>
            {AFSPRAAK_STATUSSEN.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button className={knopSecundair}>Filter</button>
      </form>

      {error && <p className={`text-sm ${tekstFout}`}>Laden mislukt: {error.message}</p>}
      {!error && rijen.length === 0 && (
        <p className={`text-sm ${tekstZacht}`}>{weergave === "komend" ? "Geen komende afspraken." : "Geen afspraken gevonden."}</p>
      )}

      {[...perDag.entries()].map(([dag, lijst]) => (
        <div key={dag} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-foreground/70 uppercase">{datumLabel(vanAmsterdam(dag, 720))}</h2>
          <ul className="flex flex-col gap-2">
            {lijst.map((r) => (
              <li key={r.id}>
                <Link
                  href={`${PAD}/${r.id}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm hover:border-accent/50 dark:border-white/15"
                >
                  <span className="flex min-w-0 items-baseline gap-3">
                    <span className="font-semibold tabular-nums">
                      {tijdLabel(r.start_op)}–{tijdLabel(r.eind_op)}
                    </span>
                    <span className="min-w-0 truncate">
                      {r.naam} <span className={tekstZacht}>· {soortNaam(r)}</span>
                    </span>
                  </span>
                  <StatusLabel status={r.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {rijen.length === 300 && <p className={`text-xs ${tekstZacht}`}>Alleen de eerste 300 afspraken worden getoond. Gebruik het statusfilter.</p>}
    </section>
  );
}

async function Week({ week, nu }: { week?: string; nu: Date }) {
  const maandag = maandagVan(week && leesDatum(week) ? week : vandaagAmsterdam(nu));
  const zondagNa = datumPlusDagen(maandag, 7);
  const van = vanAmsterdam(maandag, 0);
  const tot = vanAmsterdam(zondagNa, 0);
  const [res, beschikbaarheid, blokkades] = await Promise.all([
    adminClient()
      .from("afspraken")
      .select("id, naam, email, start_op, eind_op, status, aanbetaling_cent, betaald_op, afspraak_soorten(naam)")
      .gte("start_op", van.toISOString())
      .lt("start_op", tot.toISOString())
      .order("start_op"),
    haalBeschikbaarheid().catch(() => []),
    haalBlokkades(van, tot).catch(() => []),
  ]);
  const rijen = (res.data ?? []) as unknown as LijstRij[];
  const vandaag = vandaagAmsterdam(nu);
  const dagen = Array.from({ length: 7 }, (_, i) => datumPlusDagen(maandag, i));

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">
          Week van {datumKortLabel(vanAmsterdam(maandag, 720))} t/m {datumKortLabel(vanAmsterdam(datumPlusDagen(maandag, 6), 720))}
        </h2>
        <div className="flex gap-2 text-sm">
          <Link href={tabUrl("week", { week: datumPlusDagen(maandag, -7) })} className={knopSecundair} aria-label="Vorige week">
            ‹ Vorige
          </Link>
          <Link href={tabUrl("week")} className={knopSecundair}>
            Deze week
          </Link>
          <Link href={tabUrl("week", { week: datumPlusDagen(maandag, 7) })} className={knopSecundair} aria-label="Volgende week">
            Volgende ›
          </Link>
        </div>
      </div>
      {res.error && <p className={`text-sm ${tekstFout}`}>Laden mislukt: {res.error.message}</p>}
      <div className="grid gap-3 md:grid-cols-7 md:gap-2">
        {dagen.map((dag) => {
          const middag = vanAmsterdam(dag, 720);
          const open = vensters(beschikbaarheid, dag);
          const dagVan = vanAmsterdam(dag, 0).getTime();
          const dagTot = vanAmsterdam(datumPlusDagen(dag, 1), 0).getTime();
          const geblokt = blokkades.filter((b) => Date.parse(b.van) < dagTot && dagVan < Date.parse(b.tot));
          const lijst = rijen.filter((r) => naarAmsterdam(new Date(r.start_op)).datum === dag);
          return (
            <div
              key={dag}
              className={`${kaart} min-h-24 !gap-2 !p-3 ${dag === vandaag ? "!border-accent/60" : ""} ${geblokt.length ? "bg-black/[0.03] dark:bg-white/[0.03]" : ""}`}
            >
              <p className={`text-sm font-semibold first-letter:uppercase ${dag === vandaag ? "text-accent" : ""}`}>{datumKortLabel(middag)}</p>
              {open.length > 0 && (
                <p className={`text-xs ${tekstZacht}`}>
                  Open {open.map((o) => `${tijdLabel(new Date(o.van))}–${tijdLabel(new Date(o.tot))}`).join(", ")}
                </p>
              )}
              {geblokt.map((b) => (
                <p key={b.id} className="rounded bg-black/5 px-2 py-1 text-xs dark:bg-white/10">
                  Geblokkeerd{b.reden ? `: ${b.reden}` : ""}
                </p>
              ))}
              <ul className="flex flex-col gap-1.5">
                {lijst.map((r) => (
                  <li key={r.id}>
                    <Link href={`${PAD}/${r.id}`} className="flex flex-col gap-0.5 rounded-lg bg-accent-zacht/60 px-2 py-1.5 text-xs hover:bg-accent-zacht">
                      <span className="font-semibold tabular-nums">
                        {tijdLabel(r.start_op)}–{tijdLabel(r.eind_op)}
                      </span>
                      <span className={`truncate ${r.status === "geannuleerd" ? "line-through opacity-60" : ""}`}>{r.naam}</span>
                      <span className="truncate opacity-70">{soortNaam(r)}</span>
                      {r.status !== "bevestigd" && (
                        <span>
                          <StatusLabel status={r.status} />
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {!lijst.length && !open.length && !geblokt.length && <p className={`text-xs ${tekstZacht}`}>—</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
