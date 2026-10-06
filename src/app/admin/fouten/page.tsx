import type { Metadata } from "next";
import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BRON_LABEL, BRONNEN, isBron, type FoutBron } from "@/lib/fouten/regels";
import { AdminNav, Melding } from "../AdminNav";
import { heropen, markeerOpgelost } from "./acties";
import { BRON_KLEUR } from "./bronKleur";
import { TestfoutKnop } from "./TestfoutKnop";
import { veiligeZoekterm } from "@/lib/zoeken/regels";
import { Paginering } from "@/components/admin/Paginering";
import { badge, invoer, knop, knopKlein } from "@/components/admin/stijl";
import { datumTijd } from "@/lib/datum";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fouten · Beheer" };

const PAD = "/admin/fouten";
const PER_PAGINA = 50;

interface Filter {
  opgelost: boolean;
  bron: FoutBron | null;
  q: string;
  pagina: number;
}

function leesFilter(zoek: Record<string, string | string[] | undefined>): Filter {
  const pagina = Number(zoek.pagina);
  return {
    opgelost: zoek.tab === "opgelost",
    bron: isBron(zoek.bron) ? zoek.bron : null,
    q: veiligeZoekterm(zoek.q),
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  };
}

function filterUrl(f: Filter): string {
  const p = new URLSearchParams();
  if (f.opgelost) p.set("tab", "opgelost");
  if (f.bron) p.set("bron", f.bron);
  if (f.q) p.set("q", f.q);
  if (f.pagina > 1) p.set("pagina", String(f.pagina));
  const q = p.toString();
  return q ? `${PAD}?${q}` : PAD;
}

interface FoutRegel {
  id: string;
  bron: string;
  bericht: string;
  pad: string | null;
  aantal: number;
  laatst_op: string;
  eerst_op: string;
  opgelost: boolean;
}

export default async function FoutenPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("fouten");
  const zoek = await searchParams;
  const filter = leesFilter(zoek);
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  const supabase = adminClient();
  let query = supabase
    .from("fouten_log")
    .select("id, bron, bericht, pad, aantal, laatst_op, eerst_op, opgelost", { count: "exact" })
    .eq("opgelost", filter.opgelost)
    .order("laatst_op", { ascending: false });
  if (filter.bron) query = query.eq("bron", filter.bron);
  if (filter.q) query = query.or(`bericht.ilike.%${filter.q}%,pad.ilike.%${filter.q}%,digest.eq.${filter.q}`);
  const van = (filter.pagina - 1) * PER_PAGINA;

  const [lijst, open, opgelost] = await Promise.all([
    query.range(van, van + PER_PAGINA - 1),
    supabase.from("fouten_log").select("id", { count: "exact", head: true }).eq("opgelost", false),
    supabase.from("fouten_log").select("id", { count: "exact", head: true }).eq("opgelost", true),
  ]);
  const fouten = (lijst.data ?? []) as FoutRegel[];
  const totaal = lijst.count ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  const hier = filterUrl(filter);

  const tabs = [
    { opgelost: false, label: "Open", aantal: open.count },
    { opgelost: true, label: "Opgelost", aantal: opgelost.count },
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/fouten" />
      <AdminKop
        titel="Fouten"
        beschrijving={
          <>
            Fouten op de website, in de browser van bezoekers, in de nachtelijke taken en de beheermeldingen, gebundeld
            per soort. Bij een nieuwe fout krijg je een mail (op het e-mailadres voor foutmeldingen in{" "}
            <Link href="/admin/instellingen" className="underline underline-offset-4">
              Instellingen
            </Link>
            ). Opgeloste fouten worden na 90 dagen automatisch verwijderd. E-mailadressen, tokens en querystrings worden
            niet opgeslagen.
          </>
        }
        acties={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/status" className={knopKlein}>
              Verbindingsstatus
            </Link>
            <TestfoutKnop className={knopKlein} />
          </div>
        }
      />

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || lijst.error) && (
        <Melding soort="fout">{fout ?? `Fouten laden mislukt: ${lijst.error?.message ?? "onbekend"}`}</Melding>
      )}

      <nav aria-label="Open of opgelost" className="flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => {
          const actief = filter.opgelost === t.opgelost;
          return (
            <Link
              key={t.label}
              href={filterUrl({ ...filter, opgelost: t.opgelost, pagina: 1 })}
              aria-current={actief ? "page" : undefined}
              className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
                actief
                  ? "border-accent/50 bg-accent-zacht"
                  : "border-black/10 bg-kaart hover:border-accent/30 dark:border-white/15"
              }`}
            >
              <span className="text-black/70 dark:text-white/70">{t.label}</span>
              {t.aantal != null && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    !t.opgelost && t.aantal > 0 ? "bg-accent font-semibold text-background" : "text-foreground/70"
                  }`}
                >
                  {t.aantal}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={PAD} method="get" className="flex flex-wrap gap-2">
        {filter.opgelost && <input type="hidden" name="tab" value="opgelost" />}
        <select name="bron" defaultValue={filter.bron ?? ""} aria-label="Bron" className={invoer}>
          <option value="">Alle bronnen</option>
          {BRONNEN.map((b) => (
            <option key={b} value={b}>
              {BRON_LABEL[b]}
            </option>
          ))}
        </select>
        <input
          name="q"
          defaultValue={filter.q}
          placeholder="Zoek in melding of pagina, of plak een foutcode"
          aria-label="Zoeken"
          className={`${invoer} flex-1`}
        />
        <button className={knop}>Zoeken</button>
      </form>
      <p className="-mt-3 text-sm text-foreground/70">
        {totaal} {totaal === 1 ? "fout" : "fouten"}
        {(filter.q || filter.bron) && (
          <>
            {" "}·{" "}
            <Link href={filterUrl({ ...filter, q: "", bron: null, pagina: 1 })} className="underline underline-offset-4">
              filter wissen
            </Link>
          </>
        )}
      </p>

      {fouten.length === 0 ? (
        <p className="text-sm text-foreground/70">
          {filter.q || filter.bron
            ? "Geen fouten gevonden."
            : filter.opgelost
              ? "Nog geen opgeloste fouten."
              : "Geen open fouten. Mooi zo."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
          {fouten.map((f) => (
            <li key={f.id} className="flex items-start gap-3 px-3 py-3 text-sm">
              <Link href={`${PAD}/${f.id}`} prefetch={false} className="flex min-w-0 flex-1 flex-col gap-1 hover:underline">
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className={`${badge} ${BRON_KLEUR[f.bron] ?? BRON_KLEUR.test}`}>
                    {BRON_LABEL[f.bron as FoutBron] ?? f.bron}
                  </span>
                  <span className="min-w-0 font-medium break-words">{f.bericht.slice(0, 200)}</span>
                </span>
                <span className="text-xs text-foreground/70">
                  {f.aantal}× · laatst {datumTijd(f.laatst_op)}
                  {f.aantal > 1 && <> · eerst {datumTijd(f.eerst_op)}</>}
                  {f.pad && <> · {f.pad}</>}
                </span>
              </Link>
              <form action={f.opgelost ? heropen : markeerOpgelost} className="shrink-0">
                <input type="hidden" name="id" value={f.id} />
                <input type="hidden" name="terug" value={hier} />
                <button className={knopKlein}>{f.opgelost ? "Heropen" : "Opgelost"}</button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <Paginering
        pagina={filter.pagina}
        paginas={paginas}
        href={(p) => filterUrl({ ...filter, pagina: p })}
        linkKlasse="underline underline-offset-4"
        tekstKlasse="text-foreground/70"
      />
    </main>
  );
}
