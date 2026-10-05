import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logPersonen, zoekLogboek } from "@/lib/beheer-log";
import {
  BEWAAR_JAREN,
  CATEGORIE_LABEL,
  ONDERWERP_LABEL,
  PER_PAGINA,
  leesLogFilter,
  logFilterParams,
  onderwerpLink,
  type LogRij,
} from "@/lib/beheer-log-regels";
import { AdminNav } from "../AdminNav";
import { Melding } from "../Melding";
import { formatteerMoment } from "../types/gedeeld";
import { Paginering } from "@/components/admin/Paginering";

export const dynamic = "force-dynamic";

const invoer =
  "w-full min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
const knopKlein =
  "rounded-full border border-black/15 px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5";

function Regel({ r }: { r: LogRij }) {
  const link = onderwerpLink(r.onderwerp_soort, r.onderwerp_id);
  const heeftDetails = r.details != null && typeof r.details === "object" && Object.keys(r.details as object).length > 0;
  return (
    <li className="flex flex-col gap-1 py-3 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-medium">{r.omschrijving || r.actie}</span>
        <span className="text-xs text-black/50 dark:text-white/50">{formatteerMoment(r.op)}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-black/55 dark:text-white/55">
        <span>{r.email ?? "onbekend"}</span>
        <span className="font-mono">{r.actie}</span>
        {r.onderwerp_soort && (
          <span>
            {ONDERWERP_LABEL[r.onderwerp_soort] ?? r.onderwerp_soort}
            {r.onderwerp_id && (
              <>
                {" "}
                {link ? (
                  <Link href={link} className="font-mono text-accent underline underline-offset-2">
                    {r.onderwerp_id.length > 14 ? `${r.onderwerp_id.slice(0, 8)}…` : r.onderwerp_id}
                  </Link>
                ) : (
                  <span className="font-mono">{r.onderwerp_id.length > 14 ? `${r.onderwerp_id.slice(0, 8)}…` : r.onderwerp_id}</span>
                )}
              </>
            )}
          </span>
        )}
      </div>
      {heeftDetails && (
        <details className="text-xs">
          <summary className="cursor-pointer text-black/50 dark:text-white/50">Details</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-black/5 p-2 dark:bg-white/10">
            {JSON.stringify(r.details, null, 2)}
          </pre>
        </details>
      )}
    </li>
  );
}

export default async function LogboekPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("logboek");
  const filter = leesLogFilter(await searchParams);
  const [personen, uitkomst] = await Promise.all([
    logPersonen(),
    zoekLogboek(filter, { aantal: PER_PAGINA, vanaf: (filter.pagina - 1) * PER_PAGINA }).then(
      (r) => ({ ok: true as const, ...r }),
      (e: unknown) => ({ ok: false as const, fout: e instanceof Error ? e.message : String(e) }),
    ),
  ]);
  const totaal = uitkomst.ok ? uitkomst.totaal : 0;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  const gefilterd = Boolean(filter.gebruiker || filter.categorie || filter.soort || filter.van || filter.tot || filter.q);
  const link = (extra: Parameters<typeof logFilterParams>[1]) => {
    const p = logFilterParams(filter, extra).toString();
    return p ? `/admin/logboek?${p}` : "/admin/logboek";
  };
  const exportParams = logFilterParams(filter, { pagina: 1 }).toString();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/logboek" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Logboek</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Wie heeft wat gedaan in het beheer: bestellingen, instellingen, beheerders, publicaties, verzonden nieuwsbrieven,
          exports en meer. Regels ouder dan {BEWAAR_JAREN} jaar worden automatisch verwijderd. Wachtwoorden en andere
          geheimen komen nooit in het logboek.
        </p>
      </div>

      <form method="get" action="/admin/logboek" className="grid grid-cols-1 gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:grid-cols-2 dark:border-white/15">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="text-black/70 dark:text-white/70">Zoeken</span>
          <input name="q" defaultValue={filter.q ?? ""} placeholder="Omschrijving, e-mailadres, actie of id" className={invoer} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/70 dark:text-white/70">Persoon</span>
          <select name="gebruiker" defaultValue={filter.gebruiker ?? ""} className={invoer}>
            <option value="">Iedereen</option>
            {personen.map((p) => (
              <option key={p.id} value={p.id}>
                {p.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/70 dark:text-white/70">Soort actie</span>
          <select name="categorie" defaultValue={filter.categorie ?? ""} className={invoer}>
            <option value="">Alle acties</option>
            {Object.entries(CATEGORIE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/70 dark:text-white/70">Onderwerp</span>
          <select name="soort" defaultValue={filter.soort ?? ""} className={invoer}>
            <option value="">Alle onderwerpen</option>
            {Object.entries(ONDERWERP_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Van</span>
            <input type="date" name="van" defaultValue={filter.van ?? ""} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Tot en met</span>
            <input type="date" name="tot" defaultValue={filter.tot ?? ""} className={invoer} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">Filteren</button>
          {gefilterd && (
            <Link href="/admin/logboek" className={knopKlein}>
              Filter wissen
            </Link>
          )}
          <a href={`/admin/logboek/export${exportParams ? `?${exportParams}` : ""}`} className={`${knopKlein} ml-auto`} download>
            Exporteren (CSV)
          </a>
        </div>
      </form>

      {!uitkomst.ok ? (
        <Melding soort="fout">Het logboek kon niet worden geladen: {uitkomst.fout}</Melding>
      ) : uitkomst.rijen.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          {gefilterd ? "Niets gevonden met dit filter." : "Nog geen acties vastgelegd."}
        </p>
      ) : (
        <section className="flex flex-col gap-2">
          <p className="text-sm text-black/60 dark:text-white/60">
            {totaal.toLocaleString("nl-NL")} {totaal === 1 ? "regel" : "regels"}
            {paginas > 1 ? ` · pagina ${filter.pagina} van ${paginas}` : ""}
          </p>
          <ul className="flex flex-col divide-y divide-black/5 rounded-2xl border border-black/10 bg-kaart px-4 dark:divide-white/10 dark:border-white/15">
            {uitkomst.rijen.map((r) => (
              <Regel key={r.id} r={r} />
            ))}
          </ul>
          <Paginering
            pagina={filter.pagina}
            paginas={paginas}
            href={(p) => link({ pagina: p })}
            linkKlasse={knopKlein}
            navKlasse="flex items-center justify-between gap-2 text-sm"
            tekst={null}
            vorige="← Nieuwer"
            volgende="Ouder →"
          />
        </section>
      )}
      <p className="text-xs text-black/50 dark:text-white/50">
        Acties die direct in de database of het Supabase-dashboard gebeuren, staan hier niet in. Een verwijderd onderwerp
        heeft geen link meer.
      </p>
    </main>
  );
}
