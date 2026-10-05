import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { toonDatumTijd } from "@/lib/datum";
import { menuLabel, sorteerPaginas, type Pagina } from "@/lib/paginas/beheer";
import { STARTPAGINAS } from "@/lib/paginas/sjablonen";
import { Melding } from "../AdminNav";
import { VerwijderKnop } from "../nieuwsbrief/_editor/VerwijderKnop";
import { kaart, knopHoofd, knopKlein, knopRand, zacht } from "../nieuwsbrief/_editor/stijl";
import { StatusBadge } from "./_editor/onderdelen";
import { PaginaKop } from "./_editor/PaginaKop";
import { dupliceerPagina, maakStartpagina, nieuwePagina, verplaatsPagina, verwijderPagina } from "./acties";

export const dynamic = "force-dynamic";

const FOUTEN: Record<string, string> = {
  aanmaken: "De pagina kon niet worden aangemaakt. Probeer het opnieuw.",
  sjabloon: "Onbekende startpagina.",
  dupliceren: "Dupliceren is niet gelukt. Probeer het opnieuw.",
  verwijderen: "Verwijderen is niet gelukt. Misschien was de pagina al verwijderd.",
  volgorde: "De volgorde kon niet worden aangepast. Probeer het opnieuw.",
  onbekend: "Deze pagina bestaat niet (meer).",
};

type Rij = Pick<Pagina, "id" | "slug" | "titel" | "status" | "in_menu" | "in_footer" | "menu_label" | "volgorde" | "bijgewerkt_op">;

function Plek({ aan, label }: { aan: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${aan ? "bg-accent-zacht font-medium text-accent" : "bg-black/[0.03] text-black/40 line-through dark:bg-white/5 dark:text-white/40"}`}
    >
      {label}
    </span>
  );
}

export default async function PaginasOverzicht({ searchParams }: { searchParams: Promise<{ fout?: string; verwijderd?: string }> }) {
  await vereisBeheerder("paginas");
  const sp = await searchParams;
  const { data, error } = await adminClient()
    .from("paginas")
    .select("id, slug, titel, status, in_menu, in_footer, menu_label, volgorde, bijgewerkt_op")
    .limit(500);
  const paginas = sorteerPaginas((data ?? []) as Rij[]);
  const bestaand = new Set(paginas.map((p) => p.slug));
  const startpaginas = STARTPAGINAS.filter((s) => !bestaand.has(s.pagina.slug));

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <PaginaKop pad={[{ label: "Overzicht" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagina&apos;s</h1>
          <p className={`text-sm ${zacht}`}>Vaste pagina&apos;s op je website, zoals &quot;Over mij&quot; en &quot;Contact&quot;, met hun plek in het menu en de footer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/versies/prullenbak" className={knopRand}>
            Prullenbak
          </Link>
          <form action={nieuwePagina}>
            <button className={knopHoofd}>+ Nieuwe pagina</button>
          </form>
        </div>
      </div>

      {sp.fout && <Melding soort="fout">{FOUTEN[sp.fout] ?? "Er ging iets mis."}</Melding>}
      {sp.verwijderd && (
        <Melding soort="ok">
          De pagina is verwijderd. Per ongeluk? Zet hem terug via de{" "}
          <Link href="/admin/versies/prullenbak" className="underline underline-offset-4">
            prullenbak
          </Link>
          .
        </Melding>
      )}
      {error && <Melding soort="fout">De pagina&apos;s konden niet worden geladen ({error.message}).</Melding>}

      {paginas.length === 0 && !error && (
        <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center text-sm dark:border-white/20 ${zacht}`}>
          Nog geen pagina&apos;s. Begin met een van de startpagina&apos;s hieronder, of klik op <strong>Nieuwe pagina</strong>.
        </p>
      )}

      {paginas.length > 0 && (
        <ol className="flex flex-col gap-3">
          {paginas.map((p, i) => (
            <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/admin/paginas/${p.id}`} className="break-words font-medium hover:text-accent hover:underline">
                    {p.titel}
                  </Link>
                  <p className={`break-all text-xs ${zacht}`}>/{p.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Plek aan={p.in_menu} label="Menu" />
                  <Plek aan={p.in_footer} label="Footer" />
                  <StatusBadge status={p.status} />
                </div>
              </div>
              <p className={`text-xs ${zacht}`}>
                Volgorde {p.volgorde}
                {p.in_menu && p.menu_label.trim() && <> · in het menu als &quot;{menuLabel(p)}&quot;</>} · bijgewerkt {toonDatumTijd(p.bijgewerkt_op)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                <form action={verplaatsPagina}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="richting" value="omhoog" />
                  <button className={knopKlein} disabled={i === 0} aria-label={`${p.titel} eerder in het menu zetten`} title="Eerder in menu en footer">
                    ↑
                  </button>
                </form>
                <form action={verplaatsPagina}>
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="richting" value="omlaag" />
                  <button
                    className={knopKlein}
                    disabled={i === paginas.length - 1}
                    aria-label={`${p.titel} later in het menu zetten`}
                    title="Later in menu en footer"
                  >
                    ↓
                  </button>
                </form>
                <Link href={`/admin/paginas/${p.id}`} className={knopKlein}>
                  Bewerken
                </Link>
                {p.status === "gepubliceerd" ? (
                  <a href={`/${p.slug}`} target="_blank" rel="noopener noreferrer" className={knopKlein}>
                    Bekijken ↗
                  </a>
                ) : (
                  <Link href={`/admin/paginas/${p.id}/voorbeeld`} className={knopKlein}>
                    Voorbeeld
                  </Link>
                )}
                <form action={dupliceerPagina}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={knopKlein}>Dupliceren</button>
                </form>
                <VerwijderKnop
                  id={p.id}
                  naam={p.titel}
                  actie={verwijderPagina}
                  extra={p.status === "gepubliceerd" ? "De pagina verdwijnt ook van je website en uit het menu." : undefined}
                />
              </div>
            </li>
          ))}
        </ol>
      )}

      {startpaginas.length > 0 && !error && (
        <section className={kaart}>
          <div>
            <h2 className="text-lg font-semibold">Startpagina&apos;s</h2>
            <p className={`text-sm ${zacht}`}>
              Maak met één klik een concept met een opzet die je zelf aanvult. Plekken met [aan te vullen: …] vul je in met je eigen gegevens; pas
              daarna kun je publiceren.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {startpaginas.map((s) => (
              <li key={s.sleutel} className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/15">
                <p className="font-medium">{s.pagina.titel}</p>
                <p className={`flex-1 text-sm ${zacht}`}>{s.omschrijving}</p>
                <form action={maakStartpagina}>
                  <input type="hidden" name="sjabloon" value={s.sleutel} />
                  <button className={knopRand}>Aanmaken als concept</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
