import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { mediaMappen, zoekMedia, type ZoekResultaat } from "@/lib/media/beheer";
import { formatAfmetingen, formatGrootte, leesTypeFilter, normaliseerMap, schoneZoekterm, TYPE_FILTERS } from "@/lib/media/regels";
import { AdminNav } from "../AdminNav";
import { Melding } from "../Melding";
import { invoerKlasse, knopKlein, knopRand, zacht } from "../nieuwsbrief/_editor/stijl";
import { ImporteerKnop, UploadPaneel } from "./MediaOverzicht";

export const dynamic = "force-dynamic";

type Zoek = { q?: string; map?: string; type?: string; pagina?: string; verwijderd?: string };

function paginaLink(sp: { q: string; map: string; type: string }, pagina: number): string {
  const p = new URLSearchParams();
  if (sp.q) p.set("q", sp.q);
  if (sp.map) p.set("map", sp.map);
  if (sp.type !== "alles") p.set("type", sp.type);
  if (pagina > 1) p.set("pagina", String(pagina));
  const s = p.toString();
  return s ? `/admin/media?${s}` : "/admin/media";
}

export default async function MediaBibliotheek({ searchParams }: { searchParams: Promise<Zoek> }) {
  await vereisBeheerder("media");
  const sp = await searchParams;
  const filters = { q: schoneZoekterm(sp.q), map: normaliseerMap(sp.map) ?? "", type: leesTypeFilter(sp.type) };
  const pagina = Math.max(1, Number.parseInt(sp.pagina ?? "1", 10) || 1);

  let resultaat: ZoekResultaat | null = null;
  let fout: string | null = null;
  let mappen: string[] = [];
  try {
    [resultaat, mappen] = await Promise.all([zoekMedia({ ...filters, map: filters.map || null, pagina }), mediaMappen()]);
  } catch (e) {
    fout = e instanceof Error ? e.message : "onbekende fout";
  }
  const gefilterd = Boolean(filters.q || filters.map || filters.type !== "alles");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 sm:p-8">
      {/* "Media" staat (nog) niet in de navigatie; daarom geen actieve link. */}
      <AdminNav actief="/admin/media" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Mediabibliotheek</h1>
          <p className={`text-sm ${zacht}`}>Alle afbeeldingen voor je website, blog en nieuwsbrief op één plek.</p>
        </div>
        <ImporteerKnop />
      </div>

      {sp.verwijderd && <Melding soort="ok">De afbeelding is verwijderd.</Melding>}
      {fout && <Melding soort="fout">De mediabibliotheek kon niet worden geladen ({fout}).</Melding>}

      <UploadPaneel mappen={mappen} />

      <form method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end" role="search">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-medium text-black/70 dark:text-white/70">
          Zoeken
          <input type="search" name="q" defaultValue={filters.q} placeholder="Naam of omschrijving…" className={invoerKlasse} />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-black/70 dark:text-white/70 sm:w-44">
          Map
          <select name="map" defaultValue={filters.map} className={invoerKlasse}>
            <option value="">Alle mappen</option>
            {mappen.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-black/70 dark:text-white/70 sm:w-40">
          Type
          <select name="type" defaultValue={filters.type} className={invoerKlasse}>
            {Object.entries(TYPE_FILTERS).map(([k, f]) => (
              <option key={k} value={k}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className={knopRand}>Zoeken</button>
          {gefilterd && (
            <Link href="/admin/media" className={knopRand}>
              Wissen
            </Link>
          )}
        </div>
      </form>

      {resultaat && (
        <>
          <p className={`text-sm ${zacht}`}>
            {resultaat.totaal === 1 ? "1 afbeelding" : `${resultaat.totaal} afbeeldingen`}
            {gefilterd && " gevonden"}
            {resultaat.paginas > 1 && ` · pagina ${resultaat.pagina} van ${resultaat.paginas}`}
          </p>

          {resultaat.items.length === 0 ? (
            <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center text-sm dark:border-white/20 ${zacht}`}>
              {gefilterd
                ? "Geen afbeeldingen gevonden met deze zoekopdracht."
                : "Nog geen afbeeldingen. Upload er hierboven een paar, of importeer de afbeeldingen die je al eerder bij blog en nieuwsbrief hebt geüpload."}
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {resultaat.items.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/admin/media/${m.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-kaart hover:border-accent/60 dark:border-white/15"
                  >
                    <span className="flex aspect-square w-full items-center justify-center bg-[repeating-conic-gradient(#0000000d_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- afbeelding uit de opslag, elk formaat */}
                      <img src={m.url} alt={m.alt} loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 px-2 py-1.5">
                      <span className="truncate text-xs font-medium group-hover:text-accent">{m.naam}</span>
                      <span className={`truncate text-[11px] ${zacht}`}>
                        {m.map} · {formatGrootte(m.grootte)}
                        {formatAfmetingen(m.breedte, m.hoogte) && ` · ${formatAfmetingen(m.breedte, m.hoogte)}`}
                      </span>
                      {!m.alt && <span className="truncate text-[11px] text-amber-700 dark:text-amber-400">Geen omschrijving</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {resultaat.paginas > 1 && (
            <nav aria-label="Pagina's" className="flex items-center justify-center gap-2">
              {resultaat.pagina > 1 ? (
                <Link href={paginaLink(filters, resultaat.pagina - 1)} className={knopKlein}>
                  ← Vorige
                </Link>
              ) : (
                <span className={`${knopKlein} opacity-30`}>← Vorige</span>
              )}
              <span className={`text-xs ${zacht}`}>
                {resultaat.pagina} / {resultaat.paginas}
              </span>
              {resultaat.pagina < resultaat.paginas ? (
                <Link href={paginaLink(filters, resultaat.pagina + 1)} className={knopKlein}>
                  Volgende →
                </Link>
              ) : (
                <span className={`${knopKlein} opacity-30`}>Volgende →</span>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
