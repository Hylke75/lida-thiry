import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { toonPercentage } from "@/lib/nieuwsbrief/rapport";
import { SJABLONEN, beschrijfMoment, type Trigger } from "@/lib/nieuwsbrief/sjablonen";
import { statistiekPerCampagne } from "@/lib/nieuwsbrief/statistiek";
import { Melding } from "../../AdminNav";
import { ActiefBadge, NieuwsbriefKop } from "../_editor/onderdelen";
import { VerwijderKnop } from "../_editor/VerwijderKnop";
import { kaart, knopKlein, knopRand, zacht } from "../_editor/stijl";
import { maakAutomatisering, verwijderAutomatisering } from "./acties";

export const dynamic = "force-dynamic";

const FOUTEN: Record<string, string> = {
  aanmaken: "De automatische mail kon niet worden aangemaakt. Probeer het opnieuw.",
  verwijderen: "Zet de automatische mail eerst uit voordat je hem verwijdert.",
  onbekend: "Deze automatische mail bestaat niet (meer).",
};

interface Rij {
  id: string;
  naam: string;
  onderwerp: string;
  trigger: Trigger | null;
  vertraging_dagen: number;
  actief: boolean;
}

export default async function AutomatischOverzicht({ searchParams }: { searchParams: Promise<{ fout?: string; verwijderd?: string }> }) {
  await vereisBeheerder();
  const { fout, verwijderd } = await searchParams;
  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .select("id, naam, onderwerp, trigger, vertraging_dagen, actief")
    .eq("soort", "automatisch")
    .order("aangemaakt_op");
  const autos = (data ?? []) as Rij[];
  const stats = await statistiekPerCampagne(autos.map((a) => a.id));

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <NieuwsbriefKop pad={[{ label: "Automatische mails" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Automatische mails</h1>
        <p className={`text-sm ${zacht}`}>
          Mails die vanzelf worden verstuurd, bijvoorbeeld een welkomstmail na het aanmelden of tips een week nadat een
          klant haar advies heeft ontvangen. Iedereen krijgt elke automatische mail maar één keer.
        </p>
      </div>

      {fout && <Melding soort="fout">{FOUTEN[fout] ?? "Er ging iets mis."}</Melding>}
      {verwijderd && <Melding soort="ok">De automatische mail is verwijderd.</Melding>}
      {error && <Melding soort="fout">De automatische mails konden niet worden geladen ({error.message}).</Melding>}

      {autos.length === 0 && !error && (
        <p className={`rounded-2xl border border-dashed border-black/15 px-5 py-6 text-center text-sm dark:border-white/20 ${zacht}`}>
          Nog geen automatische mails. Begin hieronder met een van de voorbeelden.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {autos.map((a) => {
          const t = stats.get(a.id);
          return (
            <li key={a.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Link href={`/admin/nieuwsbrief/automatisch/${a.id}`} className="break-words font-medium hover:text-accent hover:underline">
                    {a.naam}
                  </Link>
                  <p className={`break-words text-sm ${zacht}`}>{a.onderwerp || "(nog geen onderwerp)"}</p>
                </div>
                <ActiefBadge actief={a.actief} />
              </div>
              <p className={`text-xs ${zacht}`}>{beschrijfMoment(a.trigger, a.vertraging_dagen)}</p>
              {t && (
                <dl className="grid grid-cols-3 gap-x-4 text-sm sm:max-w-md">
                  <div>
                    <dt className={`text-xs ${zacht}`}>Verzonden</dt>
                    <dd>{t.verzonden.toLocaleString("nl-NL")}</dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${zacht}`}>Geopend</dt>
                    <dd>{toonPercentage(t.geopend, t.verzonden)}</dd>
                  </div>
                  <div>
                    <dt className={`text-xs ${zacht}`}>Geklikt</dt>
                    <dd>{toonPercentage(t.geklikt, t.verzonden)}</dd>
                  </div>
                </dl>
              )}
              <div className="flex flex-wrap gap-1.5">
                <Link href={`/admin/nieuwsbrief/automatisch/${a.id}`} className={knopKlein}>
                  Bewerken
                </Link>
                <Link href={`/admin/nieuwsbrief/campagnes/${a.id}/rapport`} className={knopKlein}>
                  Rapport
                </Link>
                {!a.actief && (
                  <VerwijderKnop id={a.id} naam={a.naam} actie={verwijderAutomatisering} extra="De cijfers van deze mail verdwijnen ook." />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Nieuwe automatische mail</h2>
        <p className={`text-sm ${zacht}`}>Kies een voorbeeld om mee te beginnen. Je kunt alles daarna aanpassen; de mail staat pas aan als jij hem aanzet.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SJABLONEN.map((s) => (
            <form key={s.sleutel} action={maakAutomatisering} className="flex flex-col gap-2 rounded-xl border border-black/10 p-4 dark:border-white/15">
              <input type="hidden" name="sjabloon" value={s.sleutel} />
              <p className="font-medium">{s.titel}</p>
              <p className={`flex-1 text-sm ${zacht}`}>{s.uitleg}</p>
              <button className={`${knopRand} w-fit`}>Gebruik dit voorbeeld</button>
            </form>
          ))}
        </div>
        <form action={maakAutomatisering}>
          <button className="text-sm text-accent underline underline-offset-4">Of begin met een lege mail</button>
        </form>
      </section>
    </main>
  );
}
