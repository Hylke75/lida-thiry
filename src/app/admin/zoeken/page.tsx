import type { Metadata } from "next";
import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { markeer, MIN_ZOEKTERM, normaliseerZoekterm } from "@/lib/zoeken/regels";
import { zoekOveral, type ZoekGroep } from "@/lib/zoeken/zoeken";
import { AdminNav, Melding } from "../AdminNav";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Zoeken · Beheer" };

function Gemarkeerd({ tekst, woorden }: { tekst: string; woorden: readonly string[] }) {
  return (
    <>
      {markeer(tekst, woorden).map((s, i) =>
        s.treffer ? (
          <mark key={i} className="rounded-sm bg-accent-zacht px-0.5 text-inherit">
            {s.tekst}
          </mark>
        ) : (
          <span key={i}>{s.tekst}</span>
        ),
      )}
    </>
  );
}

function Groep({ groep, woorden }: { groep: ZoekGroep; woorden: readonly string[] }) {
  const meer = groep.totaal - groep.treffers.length;
  return (
    <section aria-labelledby={`groep-${groep.soort}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`groep-${groep.soort}`} className="text-lg">
          {groep.label}{" "}
          <span className="font-sans text-sm tabular-nums text-black/50 dark:text-white/50">({groep.totaal})</span>
        </h2>
        {meer > 0 && (
          <Link href={groep.meer} className="text-sm text-accent underline underline-offset-2">
            {groep.meerGefilterd ? `Alle ${groep.totaal} bekijken` : `Nog ${meer} — naar ${groep.label.toLowerCase()}`}
          </Link>
        )}
      </div>
      {groep.fout ? (
        <Melding soort="fout">Zoeken in {groep.label.toLowerCase()} is mislukt.</Melding>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
          {groep.treffers.map((t) => (
            <li key={t.id}>
              <Link
                href={t.href}
                prefetch={false}
                className="flex items-start justify-between gap-3 px-3 py-2.5 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">
                    <Gemarkeerd tekst={t.titel} woorden={woorden} />
                  </span>
                  {t.sub && (
                    <span className="truncate text-black/60 dark:text-white/60">
                      <Gemarkeerd tekst={t.sub} woorden={woorden} />
                    </span>
                  )}
                  {t.tekst && (
                    <span className="line-clamp-2 break-words text-black/50 dark:text-white/50">
                      <Gemarkeerd tekst={t.tekst} woorden={woorden} />
                    </span>
                  )}
                </span>
                {t.label && (
                  <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-xs text-black/60 dark:bg-white/10 dark:text-white/60">
                    {t.label}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function ZoekPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder();
  const q = normaliseerZoekterm((await searchParams).q);
  const teKort = q.length > 0 && q.length < MIN_ZOEKTERM;
  const { woorden, groepen } = q && !teKort ? await zoekOveral(q) : { woorden: [], groepen: [] };
  const totaal = groepen.reduce((n, g) => n + g.totaal, 0);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Zoeken</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Zoekt in bestellingen, adresboek, berichten, afspraken, nieuwsbrief, pagina&apos;s, blog, kortingscodes en
          media. Tip: druk op <kbd className="rounded border border-black/15 px-1 text-xs dark:border-white/20">/</kbd> of{" "}
          <kbd className="rounded border border-black/15 px-1 text-xs dark:border-white/20">Ctrl K</kbd> om vanaf elke
          beheerpagina te zoeken.
        </p>
      </header>

      <form action="/admin/zoeken" method="get" role="search" className="flex flex-wrap gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          autoFocus={!q}
          placeholder="Naam, e-mail, bestelnummer, code, titel…"
          aria-label="Zoekterm"
          className="min-w-0 flex-1 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20"
        />
        <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90">
          Zoeken
        </button>
      </form>

      {teKort && <p className="text-sm text-black/60 dark:text-white/60">Typ minstens {MIN_ZOEKTERM} tekens.</p>}

      {q && !teKort && (
        <p className="-mt-3 text-sm text-black/60 dark:text-white/60" role="status">
          {totaal === 0
            ? `Niets gevonden voor “${q}”.`
            : `${totaal} ${totaal === 1 ? "resultaat" : "resultaten"} voor “${q}”${
                groepen.length > 1 ? ` in ${groepen.length} onderdelen` : ""
              }.`}
        </p>
      )}

      {groepen.length > 1 && (
        <nav aria-label="Onderdelen" className="-mt-2 flex flex-wrap gap-1 text-sm">
          {groepen.map((g) => (
            <a
              key={g.soort}
              href={`#groep-${g.soort}`}
              className="rounded-full border border-black/10 px-3 py-1 text-black/60 hover:bg-black/5 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"
            >
              {g.label} <span className="tabular-nums">{g.totaal}</span>
            </a>
          ))}
        </nav>
      )}

      {groepen.map((g) => (
        <Groep key={g.soort} groep={g} woorden={woorden} />
      ))}
    </main>
  );
}
