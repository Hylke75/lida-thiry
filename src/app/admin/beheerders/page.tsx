import { vereisBeheerder } from "@/lib/admin-auth";
import { lijstBeheerders } from "@/lib/beheerders";
import { AdminNav } from "../AdminNav";
import { formatteerMoment } from "../types/gedeeld";
import { RijActies, ToevoegFormulier, WachtwoordFormulier } from "./Formulieren";

export const dynamic = "force-dynamic";

const kaart = "flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15";

export default async function BeheerdersPagina({ searchParams }: { searchParams: Promise<{ welkom?: string }> }) {
  const ik = await vereisBeheerder();
  const { welkom } = await searchParams;
  const beheerders = await lijstBeheerders();

  const wachtwoord = (
    <section id="wachtwoord" className={`${kaart} scroll-mt-6 ${welkom ? "border-accent/50" : ""}`}>
      <h2 className="text-lg">Je eigen wachtwoord {welkom ? "instellen" : "wijzigen"}</h2>
      <p className="text-sm text-black/60 dark:text-white/60">
        Je bent ingelogd als <strong>{ik.email}</strong>. Kies een wachtwoord van minstens 10 tekens; een zinnetje van
        een paar woorden is makkelijk te onthouden en toch sterk.
      </p>
      <WachtwoordFormulier email={ik.email ?? ""} />
    </section>
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/beheerders" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Beheerders</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Wie kan inloggen in dit beheer. Iedere beheerder kan alles: bestellingen inzien, teksten en instellingen
          wijzigen en andere beheerders toevoegen of verwijderen.
        </p>
      </div>

      {welkom && (
        <p role="status" className="rounded-lg bg-accent-zacht px-4 py-3 text-sm">
          Welkom! Je bent ingelogd. Kies hieronder een eigen wachtwoord; daarmee log je voortaan in via de inlogpagina.
        </p>
      )}
      {welkom && wachtwoord}

      <section className={kaart}>
        <h2 className="text-lg">Huidige beheerders</h2>
        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {beheerders.map((b) => (
            <li key={b.gebruiker_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col text-sm">
                <span className="break-all font-medium">
                  {b.email}
                  {b.gebruiker_id === ik.id && (
                    <span className="ml-2 font-normal text-black/50 dark:text-white/50">(jij)</span>
                  )}
                </span>
                <span className="text-xs text-black/50 dark:text-white/50">
                  Toegevoegd {formatteerMoment(b.aangemaakt_op)} ·{" "}
                  {b.laatstIngelogd ? `laatst ingelogd ${formatteerMoment(b.laatstIngelogd)}` : "nog nooit ingelogd"}
                  {b.uitgenodigd && " (uitnodiging nog niet geaccepteerd)"}
                </span>
              </div>
              <RijActies
                id={b.gebruiker_id}
                email={b.email}
                isIkZelf={b.gebruiker_id === ik.id}
                isLaatste={beheerders.length <= 1}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={kaart}>
        <h2 className="text-lg">Beheerder toevoegen</h2>
        <div className="flex flex-col gap-1 text-sm text-black/60 dark:text-white/60">
          <p>
            <strong>Nieuw e-mailadres:</strong> de nieuwe beheerder krijgt een e-mail met een uitnodigingslink. Na een
            klik daarop is die ingelogd en kiest die een eigen wachtwoord. De link werkt één keer en is beperkt geldig
            (standaard 1 uur); daarna kun je hier een nieuwe sturen met ‘Inloglink sturen’. Komt de mail niet aan (bijv.
            omdat er nog geen eigen afzenderadres is ingesteld), dan kun je de link na het toevoegen ook zelf kopiëren en
            doorsturen.
          </p>
          <p>
            <strong>Bestaand account:</strong> wie al een account heeft, krijgt direct toegang en logt in met het eigen
            wachtwoord.
          </p>
        </div>
        <ToevoegFormulier />
      </section>

      {!welkom && wachtwoord}

      <p className="text-xs text-black/50 dark:text-white/50">
        Verwijderen trekt alleen de toegang tot het beheer in; het account zelf blijft bestaan en kan later weer worden
        toegevoegd. Je kunt jezelf niet verwijderen, en de laatste beheerder blijft altijd staan.
      </p>
    </main>
  );
}
