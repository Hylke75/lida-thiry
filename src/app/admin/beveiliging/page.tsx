import Link from "next/link";
import { huidigeBeheerder, vereisBeheerder } from "@/lib/admin-auth";
import { heeftRecht, ROL_LABEL, ROL_UITLEG } from "@/lib/rollen";
import { AdminNav } from "../AdminNav";
import { Melding } from "../Melding";
import { WachtwoordFormulier } from "../beheerders/Formulieren";
import { TweestapBeheer } from "./TweestapBeheer";

export const dynamic = "force-dynamic";

const kaart = "flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15";

export default async function BeveiligingPagina({
  searchParams,
}: {
  searchParams: Promise<{ welkom?: string; verplicht?: string }>;
}) {
  // Ook bereikbaar als tweestapsverificatie verplicht is maar nog niet is ingesteld.
  const ik = await vereisBeheerder(undefined, { zonderVerplichteMfa: true });
  const status = await huidigeBeheerder();
  const { welkom } = await searchParams;
  const moetInstellen = status?.mfa === "instellen_nodig";
  const verplicht = Boolean(status?.verplicht);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/beveiliging" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Beveiliging</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Je bent ingelogd als <strong>{ik.email}</strong> ({ROL_LABEL[ik.rol].toLowerCase()}: {ROL_UITLEG[ik.rol]})
        </p>
      </div>

      {welkom && (
        <Melding soort="ok">
          Welkom! Je bent ingelogd. Kies hieronder een eigen wachtwoord; daarmee log je voortaan in via de inlogpagina.
          {moetInstellen && " Koppel daarna een authenticator-app; dat is verplicht voordat je verder kunt."}
        </Melding>
      )}
      {moetInstellen && !welkom && (
        <Melding soort="fout">
          Tweestapsverificatie is verplicht. Koppel hieronder een authenticator-app; daarna kun je het beheer weer
          gebruiken.
        </Melding>
      )}

      <section id="tweestap" className={`${kaart} scroll-mt-6 ${moetInstellen ? "border-accent/50" : ""}`}>
        <h2 className="text-lg">Tweestapsverificatie</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Met tweestapsverificatie heb je bij het inloggen naast je wachtwoord ook een code van 6 cijfers nodig uit een
          app op je telefoon. Zo kan niemand inloggen met alleen een gestolen of geraden wachtwoord.
          {verplicht ? " Voor dit beheer is het verplicht." : ""}
        </p>
        <TweestapBeheer verplicht={verplicht} />
        <details className="text-sm text-black/60 dark:text-white/60">
          <summary className="cursor-pointer font-medium text-black/80 dark:text-white/80">
            Telefoon kwijt? Zo kom je weer binnen
          </summary>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
            <li>
              <strong>Voorkom het:</strong> koppel een tweede app (bijv. op een reservetelefoon of in je
              wachtwoordbeheerder) of bewaar de sleutel die je bij het koppelen ziet op een veilige plek. Daarmee kun je
              de codes later opnieuw instellen.
            </li>
            <li>
              <strong>Andere eigenaar:</strong> een eigenaar kan onder Instellingen → Beheerders bij jouw naam op
              ‘Tweestap resetten’ klikken. Daarna log je in met alleen je wachtwoord en koppel je meteen een nieuwe app.
            </li>
            <li>
              <strong>Ben je de enige eigenaar:</strong> verwijder de factor in het Supabase-dashboard (Authentication →
              Users → jouw account → MFA-factor verwijderen) en koppel daarna hier een nieuwe app.
            </li>
            <li>Nieuwe telefoon? Koppel eerst de nieuwe app en verwijder daarna pas de oude.</li>
          </ul>
        </details>
      </section>

      <section id="wachtwoord" className={`${kaart} scroll-mt-6 ${welkom ? "border-accent/50" : ""}`}>
        <h2 className="text-lg">Je eigen wachtwoord {welkom ? "instellen" : "wijzigen"}</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Kies een wachtwoord van minstens 10 tekens; een zinnetje van een paar woorden is makkelijk te onthouden en
          toch sterk.
        </p>
        <WachtwoordFormulier email={ik.email ?? ""} />
      </section>

      {heeftRecht(ik.rol, "beheerders") && !moetInstellen && (
        <p className="text-xs text-black/50 dark:text-white/50">
          Tweestapsverificatie voor iedereen verplicht maken kan onder{" "}
          <Link href="/admin/instellingen" className="underline underline-offset-4">
            Instellingen → Algemeen
          </Link>{" "}
          (‘Tweestapsverificatie verplicht’). Wie al een app heeft, gebruikt die altijd.
        </p>
      )}
    </main>
  );
}
