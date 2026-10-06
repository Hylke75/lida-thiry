import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { aiBeschikbaar } from "@/lib/blog/ai";
import { AI_LIMIET_PER_UUR, filterBerichten, toonDollar, uniekGesorteerd } from "@/lib/blog/beheer";
import { leestijdMinuten, zichtbaarheid, type BlogBericht } from "@/lib/blog/regels";
import { amsterdamNaarUtc, toonDatumTijd, utcNaarAmsterdamInvoer } from "@/lib/datum";
import { Melding } from "../AdminNav";
import { VerwijderKnop } from "../nieuwsbrief/_editor/VerwijderKnop";
import { AiBadge, BlogKop, ZichtbaarheidBadge } from "./_editor/onderdelen";
import { dupliceerBericht, nieuwBericht, verwijderBericht } from "./acties";
import { invoerBreed, kaart, knop, knopKlein, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const MAX = 500;

const FOUTEN: Record<string, string> = {
  aanmaken: "Het bericht kon niet worden aangemaakt. Probeer het opnieuw.",
  dupliceren: "Dupliceren is niet gelukt. Probeer het opnieuw.",
  verwijderen: "Verwijderen is niet gelukt. Misschien was het bericht al verwijderd.",
  onbekend: "Dit bericht bestaat niet (meer).",
};

type Rij = Pick<
  BlogBericht,
  "id" | "slug" | "titel" | "inhoud" | "categorie" | "tags" | "status" | "gepubliceerd_op" | "ai_gegenereerd" | "uitgelicht" | "bijgewerkt_op"
>;

/** Aantal AI-aanroepen en geschatte kosten deze maand (Nederlandse tijd). */
async function aiGebruikDezeMaand(): Promise<{ aanroepen: number; dollarcent: number; laatsteUur: number } | null> {
  const maandStart = amsterdamNaarUtc(`${utcNaarAmsterdamInvoer(new Date()).slice(0, 7)}-01T00:00`);
  if (!maandStart) return null;
  const supabase = adminClient();
  const [maand, uur] = await Promise.all([
    supabase.from("blog_ai_gebruik").select("kosten_dollarcent").gte("op", maandStart.toISOString()).limit(10_000),
    supabase
      .from("blog_ai_gebruik")
      .select("id", { count: "exact", head: true })
      .gte("op", new Date(Date.now() - 3_600_000).toISOString()),
  ]);
  if (maand.error) return null;
  const rijen = maand.data ?? [];
  return {
    aanroepen: rijen.length,
    dollarcent: rijen.reduce((som, r) => som + Number(r.kosten_dollarcent ?? 0), 0),
    laatsteUur: uur.count ?? 0,
  };
}

export default async function BlogOverzicht({
  searchParams,
}: {
  searchParams: Promise<{ zoek?: string; status?: string; categorie?: string; tag?: string; fout?: string; verwijderd?: string }>;
}) {
  await vereisBeheerder("blog");
  const sp = await searchParams;

  const [{ data, error }, gebruik] = await Promise.all([
    adminClient()
      .from("blog_berichten")
      .select("id, slug, titel, inhoud, categorie, tags, status, gepubliceerd_op, ai_gegenereerd, uitgelicht, bijgewerkt_op")
      .order("gepubliceerd_op", { ascending: false, nullsFirst: true })
      .order("bijgewerkt_op", { ascending: false })
      .limit(MAX),
    aiGebruikDezeMaand(),
  ]);
  const alle = (data ?? []) as Rij[];
  const nu = new Date();
  const berichten = filterBerichten(alle, sp, nu);
  const categorieen = uniekGesorteerd(alle.map((b) => b.categorie));
  const tags = uniekGesorteerd(alle.flatMap((b) => b.tags));
  const gefilterd = Boolean(sp.zoek || sp.status || sp.categorie || sp.tag);
  const ai = aiBeschikbaar();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <BlogKop actief="/admin/blog" pad={[{ label: "Berichten" }]} />
      <AdminKop
        titel="Blog"
        beschrijving="Schrijf berichten voor je website, zelf of met hulp van AI."
        acties={
          <>
            <Link href="/admin/versies/prullenbak" className={knopSecundair}>
              Prullenbak
            </Link>
            <Link href="/admin/blog/ai" className={knopSecundair}>
              ✨ Schrijven met AI
            </Link>
            <form action={nieuwBericht}>
              <button className={knop}>+ Nieuw bericht</button>
            </form>
          </>
        }
      />

      {sp.fout && <Melding soort="fout">{FOUTEN[sp.fout] ?? "Er ging iets mis."}</Melding>}
      {sp.verwijderd && (
        <Melding soort="ok">
          Het bericht is verwijderd. Per ongeluk? Zet het terug via de{" "}
          <Link href="/admin/versies/prullenbak" className="underline underline-offset-4">
            prullenbak
          </Link>
          .
        </Melding>
      )}
      {error && <Melding soort="fout">De berichten konden niet worden geladen ({error.message}).</Melding>}

      {gebruik && (ai || gebruik.aanroepen > 0) && (
        <p className={`rounded-lg bg-black/[0.03] px-4 py-3 text-sm dark:bg-white/5 ${tekstZacht}`}>
          <span className="font-medium text-foreground">AI-gebruik deze maand:</span> {gebruik.aanroepen} keer gebruikt, geschatte kosten {toonDollar(gebruik.dollarcent)}{" "}
          <span className="text-xs">(in dollars, op basis van het aantal verwerkte woorden; de echte rekening kan iets afwijken)</span>.
          {gebruik.laatsteUur > 0 && (
            <span className="text-xs">
              {" "}
              Afgelopen uur: {gebruik.laatsteUur} van maximaal {AI_LIMIET_PER_UUR}.
            </span>
          )}
        </p>
      )}

      <form method="get" className={`${kaart} sm:flex-row sm:flex-wrap sm:items-end`}>
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:min-w-48">
          <label htmlFor="zoek" className="text-sm font-medium">
            Zoeken op titel
          </label>
          <input id="zoek" name="zoek" type="search" defaultValue={sp.zoek ?? ""} className={invoerBreed} placeholder="Bijv. jurken" />
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap">
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select id="status" name="status" defaultValue={sp.status ?? ""} className={invoerBreed}>
              <option value="">Alle</option>
              <option value="concept">Concept</option>
              <option value="ingepland">Ingepland</option>
              <option value="online">Online</option>
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="categorie" className="text-sm font-medium">
              Categorie
            </label>
            <select id="categorie" name="categorie" defaultValue={sp.categorie ?? ""} className={invoerBreed}>
              <option value="">Alle</option>
              {categorieen.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="tag" className="text-sm font-medium">
              Tag
            </label>
            <select id="tag" name="tag" defaultValue={sp.tag ?? ""} className={invoerBreed}>
              <option value="">Alle</option>
              {tags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <button className={knopSecundair}>Filteren</button>
          {gefilterd && (
            <Link href="/admin/blog" className={`${knopSecundair} text-center`}>
              Wissen
            </Link>
          )}
        </div>
      </form>

      {alle.length === 0 && !error && (
        <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center text-sm dark:border-white/20 ${tekstZacht}`}>
          Nog geen berichten. Klik op <strong>Nieuw bericht</strong> om zelf te schrijven, of op <strong>Schrijven met AI</strong> om
          een eerste opzet te laten maken.
        </p>
      )}
      {alle.length > 0 && berichten.length === 0 && (
        <p className={`text-sm ${tekstZacht}`}>Geen berichten gevonden met deze filters.</p>
      )}

      <ul className="flex flex-col gap-3">
        {berichten.map((b) => {
          const status = zichtbaarheid(b, nu);
          return (
            <li key={b.id} className={kaart}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/admin/blog/${b.id}`} className="break-words font-medium hover:text-accent hover:underline">
                    {b.titel}
                  </Link>
                  <p className={`break-all text-xs ${tekstZacht}`}>/blog/{b.slug}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {b.uitgelicht && (
                    <span className="rounded-full bg-accent-zacht px-2 py-0.5 text-xs font-medium text-accent">Uitgelicht</span>
                  )}
                  {b.ai_gegenereerd && <AiBadge />}
                  <ZichtbaarheidBadge status={status} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className={`text-xs ${tekstZacht}`}>{status === "concept" ? "Laatst bewerkt" : status === "ingepland" ? "Verschijnt op" : "Gepubliceerd"}</dt>
                  <dd>{toonDatumTijd(status === "concept" ? b.bijgewerkt_op : b.gepubliceerd_op)}</dd>
                </div>
                <div>
                  <dt className={`text-xs ${tekstZacht}`}>Categorie</dt>
                  <dd className="break-words">{b.categorie ?? "—"}</dd>
                </div>
                <div>
                  <dt className={`text-xs ${tekstZacht}`}>Leestijd</dt>
                  <dd>{leestijdMinuten(b.inhoud)} min</dd>
                </div>
                <div>
                  <dt className={`text-xs ${tekstZacht}`}>Tags</dt>
                  <dd className="break-words">{b.tags.length ? b.tags.join(", ") : "—"}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/admin/blog/${b.id}`} className={knopKlein}>
                  Bewerken
                </Link>
                {status === "online" ? (
                  <a href={`/blog/${b.slug}`} target="_blank" rel="noopener noreferrer" className={knopKlein}>
                    Bekijken ↗
                  </a>
                ) : (
                  <Link href={`/admin/blog/${b.id}/voorbeeld`} className={knopKlein}>
                    Voorbeeld
                  </Link>
                )}
                <form action={dupliceerBericht}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className={knopKlein}>Dupliceren</button>
                </form>
                <VerwijderKnop
                  id={b.id}
                  naam={b.titel}
                  actie={verwijderBericht}
                  extra={status === "online" ? "Het bericht verdwijnt ook van je website." : undefined}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {alle.length === MAX && <p className={`text-xs ${tekstZacht}`}>Alleen de nieuwste {MAX} berichten worden getoond.</p>}
    </main>
  );
}
