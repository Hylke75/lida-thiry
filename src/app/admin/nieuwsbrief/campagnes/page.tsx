import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { beschrijfDoelgroep, normaliseerDoelgroep } from "@/lib/nieuwsbrief/doelgroep";
import { formulierNamen } from "@/lib/nieuwsbrief/formulieren";
import { toonPercentage } from "@/lib/nieuwsbrief/rapport";
import { statistiekPerCampagne } from "@/lib/nieuwsbrief/campagne-statistiek";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { Melding } from "../../AdminNav";
import { NieuwsbriefKop, StatusBadge } from "../_editor/onderdelen";
import { knopHoofd, knopKlein, zacht } from "../_editor/stijl";
import { dupliceerCampagne, nieuweCampagne, verwijderCampagne } from "./acties";
import { VerwijderKnop } from "../_editor/VerwijderKnop";

export const dynamic = "force-dynamic";

const MAX = 200;

const FOUTEN: Record<string, string> = {
  aanmaken: "De campagne kon niet worden aangemaakt. Probeer het opnieuw.",
  dupliceren: "Dupliceren is niet gelukt. Probeer het opnieuw.",
  verwijderen: "Alleen concepten kunnen worden verwijderd.",
  onbekend: "Deze campagne bestaat niet (meer).",
};

interface Rij {
  id: string;
  naam: string;
  onderwerp: string;
  doelgroep: Record<string, unknown>;
  status: string;
  ingepland_op: string | null;
  gestart_op: string | null;
  verzonden_op: string | null;
  bijgewerkt_op: string;
}

export default async function CampagnesPagina({ searchParams }: { searchParams: Promise<{ fout?: string; verwijderd?: string }> }) {
  await vereisBeheerder();
  const { fout, verwijderd } = await searchParams;

  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .select("id, naam, onderwerp, doelgroep, status, ingepland_op, gestart_op, verzonden_op, bijgewerkt_op")
    .eq("soort", "campagne")
    .order("aangemaakt_op", { ascending: false })
    .limit(MAX);
  const campagnes = (data ?? []) as Rij[];
  const [stats, types, formulieren] = await Promise.all([
    statistiekPerCampagne(campagnes.filter((c) => c.status !== "concept" && c.status !== "ingepland").map((c) => c.id)),
    haalLichaamstypes().catch(() => []),
    formulierNamen().catch(() => new Map<string, { naam: string; slug: string }>()),
  ]);
  const typeNaam = (l: string) => types.find((t) => t.code === l)?.naam ?? l;
  const formulierNaam = (id: string) => formulieren.get(id)?.naam ?? "verwijderd formulier";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <NieuwsbriefKop actief="/admin/nieuwsbrief/campagnes" pad={[{ label: "Campagnes" }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campagnes</h1>
          <p className={`text-sm ${zacht}`}>Nieuwsbrieven die je eenmalig naar (een deel van) je contacten stuurt.</p>
        </div>
        <form action={nieuweCampagne}>
          <button className={knopHoofd}>+ Nieuwe campagne</button>
        </form>
      </div>

      {fout && <Melding soort="fout">{FOUTEN[fout] ?? "Er ging iets mis."}</Melding>}
      {verwijderd && <Melding soort="ok">De campagne is verwijderd.</Melding>}
      {error && <Melding soort="fout">De campagnes konden niet worden geladen ({error.message}).</Melding>}

      {campagnes.length === 0 && !error && (
        <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center text-sm dark:border-white/20 ${zacht}`}>
          Nog geen campagnes. Klik op <strong>Nieuwe campagne</strong> om je eerste nieuwsbrief te maken.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {campagnes.map((c) => {
          const t = stats.get(c.id);
          const nogNietVerstuurd = c.status === "concept" || c.status === "ingepland";
          return (
            <li key={c.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/admin/nieuwsbrief/campagnes/${c.id}`} className="break-words font-medium hover:text-accent hover:underline">
                    {c.naam}
                  </Link>
                  <p className={`break-words text-sm ${zacht}`}>{c.onderwerp || "(nog geen onderwerp)"}</p>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <p className={`text-xs ${zacht}`}>{beschrijfDoelgroep(normaliseerDoelgroep(c.doelgroep), typeNaam, formulierNaam)}</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className={`text-xs ${zacht}`}>
                    {c.status === "ingepland" ? "Ingepland" : c.status === "concept" ? "Laatst bewerkt" : c.verzonden_op ? "Verzonden" : "Gestart"}
                  </dt>
                  <dd>
                    {toonDatumTijd(
                      c.status === "ingepland" ? c.ingepland_op : c.status === "concept" ? c.bijgewerkt_op : (c.verzonden_op ?? c.gestart_op),
                    )}
                  </dd>
                </div>
                {!nogNietVerstuurd && t && (
                  <>
                    <div>
                      <dt className={`text-xs ${zacht}`}>Ontvangers</dt>
                      <dd>
                        {t.verzonden.toLocaleString("nl-NL")}
                        {t.wachtrij > 0 && <span className={`text-xs ${zacht}`}> (+{t.wachtrij.toLocaleString("nl-NL")} wachtend)</span>}
                      </dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${zacht}`}>Geopend</dt>
                      <dd>{toonPercentage(t.geopend, t.verzonden)}</dd>
                    </div>
                    <div>
                      <dt className={`text-xs ${zacht}`}>Geklikt</dt>
                      <dd>{toonPercentage(t.geklikt, t.verzonden)}</dd>
                    </div>
                  </>
                )}
              </dl>
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/admin/nieuwsbrief/campagnes/${c.id}`} className={knopKlein}>
                  {nogNietVerstuurd ? "Bewerken" : "Bekijken"}
                </Link>
                {!nogNietVerstuurd && (
                  <Link href={`/admin/nieuwsbrief/campagnes/${c.id}/rapport`} className={knopKlein}>
                    Rapport
                  </Link>
                )}
                <form action={dupliceerCampagne}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className={knopKlein}>Dupliceren</button>
                </form>
                {c.status === "concept" && <VerwijderKnop id={c.id} naam={c.naam} actie={verwijderCampagne} />}
              </div>
            </li>
          );
        })}
      </ul>
      {campagnes.length === MAX && <p className={`text-xs ${zacht}`}>Alleen de nieuwste {MAX} campagnes worden getoond.</p>}
    </main>
  );
}
