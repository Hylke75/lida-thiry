import Link from "next/link";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { lijstBeheerders } from "@/lib/beheerders";
import { ROL_LABEL, ROL_UITLEG, ROLLEN } from "@/lib/rollen";
import { AdminNav } from "../AdminNav";
import { toonDatumTijd } from "@/lib/datum";
import { RijActies, RolKeuze, ToevoegFormulier } from "./Formulieren";
import { kaart } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function BeheerdersPagina({ searchParams }: { searchParams: Promise<{ welkom?: string }> }) {
  const { welkom } = await searchParams;
  // Oude uitnodigingslinks kwamen hier uit; het eigen wachtwoord staat nu onder Beveiliging (voor elke rol).
  if (welkom) {
    await vereisBeheerder(undefined, { zonderVerplichteMfa: true });
    redirect("/admin/beveiliging?welkom=1");
  }
  const ik = await vereisBeheerder("beheerders");
  const beheerders = await lijstBeheerders();
  const eigenaren = beheerders.filter((b) => b.rol === "eigenaar").length;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/beheerders" />
      <AdminKop
        titel="Beheerders"
        beschrijving={
          <>
            Wie kan inloggen in dit beheer, en wat mag iedereen. Je eigen wachtwoord en tweestapsverificatie regel je
            onder{" "}
            <Link href="/admin/beveiliging" className="underline underline-offset-4">
              Beveiliging
            </Link>
            .
          </>
        }
      />

      <section className={kaart}>
        <h2 className="text-lg">Rollen</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
          {ROLLEN.map((r) => (
            <div key={r} className="contents">
              <dt className="font-medium">{ROL_LABEL[r]}</dt>
              <dd className="text-foreground/70">{ROL_UITLEG[r]}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={kaart}>
        <h2 className="text-lg">Huidige beheerders</h2>
        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {beheerders.map((b) => (
            <li key={b.gebruiker_id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-col text-sm">
                <span className="break-all font-medium">
                  {b.email}
                  {b.gebruiker_id === ik.id && (
                    <span className="ml-2 font-normal text-foreground/70">(jij)</span>
                  )}
                </span>
                <span className="text-xs text-foreground/70">
                  {b.tweestap ? "Tweestapsverificatie aan" : "Geen tweestapsverificatie"} · Toegevoegd{" "}
                  {toonDatumTijd(b.aangemaakt_op)} ·{" "}
                  {b.laatstIngelogd ? `laatst ingelogd ${toonDatumTijd(b.laatstIngelogd)}` : "nog nooit ingelogd"}
                  {b.uitgenodigd && " (uitnodiging nog niet geaccepteerd)"}
                </span>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <RolKeuze
                  id={b.gebruiker_id}
                  email={b.email}
                  rol={b.rol}
                  vergrendeld={
                    b.gebruiker_id === ik.id
                      ? "Je eigen rol kan een andere eigenaar wijzigen."
                      : b.rol === "eigenaar" && eigenaren <= 1
                        ? "De laatste eigenaar blijft eigenaar."
                        : null
                  }
                />
                <RijActies
                  id={b.gebruiker_id}
                  email={b.email}
                  isIkZelf={b.gebruiker_id === ik.id}
                  isLaatste={beheerders.length <= 1 || (b.rol === "eigenaar" && eigenaren <= 1)}
                  tweestap={b.tweestap}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={kaart}>
        <h2 className="text-lg">Beheerder toevoegen</h2>
        <div className="flex flex-col gap-1 text-sm text-foreground/70">
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

      <p className="text-xs text-foreground/70">
        Verwijderen trekt alleen de toegang tot het beheer in; het account zelf blijft bestaan en kan later weer worden
        toegevoegd. Je kunt jezelf niet verwijderen of je eigen rol wijzigen, en de laatste eigenaar blijft altijd staan.
        Alle wijzigingen hier komen in het logboek.
      </p>
    </main>
  );
}
