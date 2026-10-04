import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { RELATIE_BRON_LABEL, RELATIE_BRONNEN, type Relatie } from "@/lib/relaties/regels";
import { alleRelaties, haalKoppelingen } from "@/lib/relaties/beheer";
import {
  filterRelaties,
  GEEN_KOPPELINGEN,
  heeftFilter,
  kenmerken,
  leesRelatieFilter,
  PER_PAGINA,
  relatieFilterQuery,
  SORTERING_LABEL,
  SORTERINGEN,
  sorteerRelaties,
  tagsInGebruik,
  telRelaties,
  weergaveNaam,
  type RelatieFilter,
} from "@/lib/relaties/zoeken";
import { AdminNav, Melding } from "../AdminNav";
import { BevestigKnop, SelecteerAlles } from "../nieuwsbrief/contacten/Invoer";
import { bulkActie } from "./acties";
import { ExporteerSelectie } from "./Knoppen";
import { Badges, gevaarKnop, heelZacht, hoofdknop, invoer, kleineKnop, PAD, zacht } from "./ui";

export const dynamic = "force-dynamic";

const JA_NEE_FILTERS = [
  { veld: "klant", label: "Klant", ja: "Klant (betaald)", nee: "Geen klant" },
  { veld: "nieuwsbrief", label: "Nieuwsbrief", ja: "Op de nieuwsbrief", nee: "Niet op de nieuwsbrief" },
  { veld: "bericht", label: "Bericht", ja: "Stuurde een bericht", nee: "Geen bericht" },
] as const;

export default async function AdresboekPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder();
  const zoek = await searchParams;
  const filter = leesRelatieFilter(zoek);
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  let relaties: Relatie[] = [];
  let koppelingen = GEEN_KOPPELINGEN;
  let laadFout: string | null = null;
  try {
    [relaties, koppelingen] = await Promise.all([alleRelaties(), haalKoppelingen()]);
  } catch (e) {
    laadFout = `Adresboek laden mislukt: ${e instanceof Error ? e.message : String(e)}`;
  }

  const tellingen = telRelaties(relaties, koppelingen);
  const tags = tagsInGebruik(relaties);
  const gevonden = sorteerRelaties(filterRelaties(relaties, filter, koppelingen), filter.sort);
  const totaal = gevonden.length;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  const pagina = Math.min(filter.pagina, paginas);
  const zichtbaar = gevonden.slice((pagina - 1) * PER_PAGINA, pagina * PER_PAGINA);
  const gefilterd = heeftFilter(filter);
  const huidig = `${PAD}${relatieFilterQuery({ ...filter, pagina }) ? `?${relatieFilterQuery({ ...filter, pagina })}` : ""}`;
  const link = (wijziging: Partial<RelatieFilter & { pagina: number }>) => {
    const q = relatieFilterQuery({ ...filter, pagina: 1, ...wijziging });
    return q ? `${PAD}?${q}` : PAD;
  };
  const exportQuery = relatieFilterQuery({ ...filter, pagina: undefined });

  const tegels = [
    { label: "Totaal", getal: tellingen.totaal, href: PAD, actief: !gefilterd },
    { label: "Klanten", getal: tellingen.klant, href: link({ klant: filter.klant === "ja" ? undefined : "ja" }), actief: filter.klant === "ja" },
    {
      label: "Nieuwsbrief",
      getal: tellingen.nieuwsbrief,
      href: link({ nieuwsbrief: filter.nieuwsbrief === "ja" ? undefined : "ja" }),
      actief: filter.nieuwsbrief === "ja",
    },
    { label: "Stuurden een bericht", getal: tellingen.bericht, href: link({ bericht: filter.bericht === "ja" ? undefined : "ja" }), actief: filter.bericht === "ja" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">Adresboek</h1>
          <p className={`text-sm ${zacht}`}>Iedereen die besteld heeft, op de nieuwsbrief staat of contact opnam, op één plek.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${PAD}/nieuw`} className={hoofdknop}>
            Nieuwe relatie
          </Link>
          <Link href={`${PAD}/dubbel`} className={kleineKnop}>
            Dubbelen zoeken
          </Link>
          <Link href={`${PAD}/import`} className={kleineKnop}>
            CSV importeren
          </Link>
          <a href={`${PAD}/export${exportQuery ? `?${exportQuery}` : ""}`} className={kleineKnop}>
            CSV exporteren{gefilterd ? " (huidig filter)" : ""}
          </a>
        </div>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || laadFout) && <Melding soort="fout">{fout ?? laadFout}</Melding>}

      <nav aria-label="Aantallen" className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {tegels.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.actief ? "true" : undefined}
            className={`flex flex-col rounded-lg border px-3 py-2 ${
              t.actief ? "border-accent/50 bg-accent-zacht" : "border-black/10 bg-kaart hover:border-accent/30 dark:border-white/15"
            }`}
          >
            <span className="text-xl font-semibold tabular-nums">{t.getal}</span>
            <span className={zacht}>{t.label}</span>
          </Link>
        ))}
      </nav>

      <form action={PAD} method="get" className="grid grid-cols-2 gap-2 lg:grid-cols-[2fr_repeat(6,minmax(0,1fr))_auto]">
        <input
          name="q"
          defaultValue={filter.q}
          placeholder="Zoek op naam, e-mail, telefoon, plaats of bedrijf"
          aria-label="Zoeken"
          className={`${invoer} col-span-2 lg:col-span-1`}
        />
        <select name="tag" defaultValue={filter.tag ?? ""} aria-label="Tag" className={invoer}>
          <option value="">Alle tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="bron" defaultValue={filter.bron ?? ""} aria-label="Bron" className={invoer}>
          <option value="">Alle bronnen</option>
          {RELATIE_BRONNEN.map((b) => (
            <option key={b} value={b}>
              {RELATIE_BRON_LABEL[b]}
            </option>
          ))}
        </select>
        {JA_NEE_FILTERS.map((j) => (
          <select key={j.veld} name={j.veld} defaultValue={filter[j.veld] ?? ""} aria-label={j.label} className={invoer}>
            <option value="">{j.label}: alle</option>
            <option value="ja">{j.ja}</option>
            <option value="nee">{j.nee}</option>
          </select>
        ))}
        <select name="sort" defaultValue={filter.sort ?? "naam"} aria-label="Sorteren" className={invoer}>
          {SORTERINGEN.map((s) => (
            <option key={s} value={s}>
              {SORTERING_LABEL[s]}
            </option>
          ))}
        </select>
        <button className={`${hoofdknop} col-span-2 lg:col-span-1`}>Zoeken</button>
      </form>
      <p className={`-mt-3 text-sm ${zacht}`}>
        {totaal} relatie{totaal === 1 ? "" : "s"}
        {gefilterd && (
          <>
            {" "}gevonden ·{" "}
            <Link href={filter.sort ? `${PAD}?sort=${filter.sort}` : PAD} className="underline underline-offset-4">
              filter wissen
            </Link>
          </>
        )}
      </p>

      <form action={bulkActie} className="flex flex-col gap-3">
        <input type="hidden" name="terug" value={huidig} />
        {zichtbaar.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-kaart p-3 text-sm dark:border-white/15">
            <label className="flex items-center gap-2">
              <SelecteerAlles />
              <span>Alles op deze pagina</span>
            </label>
            <span className={heelZacht}>·</span>
            <span className={zacht}>Met selectie:</span>
            <input name="tag" list="adresboek-tags" placeholder="tag" aria-label="Tag voor de selectie" className={`${invoer} w-28 py-1`} />
            <datalist id="adresboek-tags">
              {tags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button name="actie" value="tag_toevoegen" className={kleineKnop}>
              Tag toevoegen
            </button>
            <button name="actie" value="tag_verwijderen" className={kleineKnop}>
              Tag weghalen
            </button>
            <ExporteerSelectie className={kleineKnop} />
            <BevestigKnop
              name="actie"
              value="verwijderen"
              bevestiging="De geselecteerde relaties uit het adresboek verwijderen? Bestellingen, nieuwsbriefcontacten en berichten blijven bestaan. Dit kan niet ongedaan worden gemaakt."
              className={`${kleineKnop} ${gevaarKnop}`}
            >
              Verwijderen
            </BevestigKnop>
          </div>
        )}

        {zichtbaar.length === 0 ? (
          <p className={`text-sm ${heelZacht}`}>
            {gefilterd ? "Geen relaties gevonden." : "Het adresboek is nog leeg. Voeg een relatie toe of importeer een CSV-bestand."}
          </p>
        ) : (
          <div className="rounded-lg border border-black/10 bg-kaart dark:border-white/15">
            <div
              aria-hidden
              className={`hidden gap-3 border-b border-black/10 px-3 py-2 text-xs uppercase tracking-wide md:grid md:grid-cols-[1rem_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)] dark:border-white/15 ${heelZacht}`}
            >
              <span />
              <span>Naam</span>
              <span>E-mail</span>
              <span>Telefoon</span>
              <span>Plaats</span>
              <span>Tags</span>
            </div>
            <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
              {zichtbaar.map((r) => (
                <li
                  key={r.id}
                  className="grid grid-cols-[1rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 px-3 py-2.5 text-sm md:grid-cols-[1rem_minmax(0,1.3fr)_minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,1.2fr)]"
                >
                  <input type="checkbox" name="id" value={r.id} aria-label={`Selecteer ${weergaveNaam(r)}`} className="mt-1 accent-accent" />
                  <span className="flex min-w-0 flex-col gap-1">
                    <Link href={`${PAD}/${r.id}`} className="break-words font-medium hover:text-accent hover:underline">
                      {weergaveNaam(r)}
                    </Link>
                    {r.bedrijf && weergaveNaam(r) !== r.bedrijf && <span className={`text-xs ${heelZacht}`}>{r.bedrijf}</span>}
                    <Badges k={kenmerken(r, koppelingen)} />
                  </span>
                  <span className={`col-start-2 min-w-0 break-all md:col-start-auto ${zacht}`}>{r.email ?? "—"}</span>
                  <span className={`col-start-2 min-w-0 md:col-start-auto ${zacht}`}>
                    {r.telefoon ?? <span className="hidden md:inline">—</span>}
                  </span>
                  <span className={`col-start-2 min-w-0 md:col-start-auto ${zacht}`}>
                    {r.plaats ?? <span className="hidden md:inline">—</span>}
                  </span>
                  <span className="col-start-2 flex min-w-0 flex-wrap gap-1 md:col-start-auto">
                    {r.tags.map((t) => (
                      <Link key={t} href={link({ tag: t })} className="rounded-full bg-accent-zacht px-2 py-0.5 text-xs text-accent">
                        {t}
                      </Link>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>

      {paginas > 1 && (
        <nav aria-label="Pagina's" className="flex items-center justify-between text-sm">
          {pagina > 1 ? (
            <Link href={link({ pagina: pagina - 1 })} className={kleineKnop}>
              ← Vorige
            </Link>
          ) : (
            <span />
          )}
          <span className={zacht}>
            Pagina {pagina} van {paginas}
          </span>
          {pagina < paginas ? (
            <Link href={link({ pagina: pagina + 1 })} className={kleineKnop}>
              Volgende →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
