"use client";

import { startTransition, useActionState, useRef, useState, type FormEvent, type ReactNode } from "react";
import { stuurInlogLink, verwijderBeheerder, voegBeheerderToe, wijzigWachtwoord, type BeheerUitkomst } from "./acties";
import { MIN_WACHTWOORD } from "@/lib/beheerder-regels";

type Actie = (vorige: BeheerUitkomst | null, fd: FormData) => Promise<BeheerUitkomst>;

const invoer =
  "w-full min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
const hoofdknop =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50";
const kleineKnop =
  "rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";

function KopieerLink({ link }: { link: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  return (
    <span className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Inloglink" className={`${invoer} font-mono text-xs`} />
      <button
        type="button"
        className={kleineKnop}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setGekopieerd(true);
          } catch {
            setGekopieerd(false);
          }
        }}
      >
        {gekopieerd ? "Gekopieerd ✓" : "Kopieer link"}
      </button>
    </span>
  );
}

function Uitkomst({ uitkomst, bezig }: { uitkomst: BeheerUitkomst | null; bezig: boolean }) {
  if (bezig) return <p className="basis-full text-sm text-black/50 dark:text-white/50">Bezig…</p>;
  if (!uitkomst) return null;
  return (
    <div
      role={uitkomst.ok ? "status" : "alert"}
      className={`basis-full text-sm ${uitkomst.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
    >
      <p>{uitkomst.ok ? `✓ ${uitkomst.melding}` : uitkomst.melding}</p>
      {uitkomst.link && (
        <>
          <KopieerLink link={uitkomst.link} />
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Deze link logt direct in. Deel hem alleen met de beheerder zelf; hij werkt één keer en is beperkt
            geldig (standaard 1 uur).
          </p>
        </>
      )}
    </div>
  );
}

function Formulier({
  actie,
  bevestig,
  legenNaSucces = false,
  className,
  children,
}: {
  actie: Actie;
  bevestig?: string;
  legenNaSucces?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [uitkomst, voerUit, bezig] = useActionState(async (v: BeheerUitkomst | null, fd: FormData) => {
    const r = await actie(v, fd);
    if (r.ok && legenNaSucces) ref.current?.reset();
    return r;
  }, null);

  function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bevestig && !window.confirm(bevestig)) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => voerUit(fd));
  }

  return (
    <form ref={ref} onSubmit={verstuur} className={className}>
      <fieldset disabled={bezig} className="contents">
        {children}
      </fieldset>
      <Uitkomst uitkomst={uitkomst} bezig={bezig} />
    </form>
  );
}

export function ToevoegFormulier() {
  return (
    <Formulier actie={voegBeheerderToe} legenNaSucces className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
      <input
        type="email"
        name="email"
        required
        autoComplete="off"
        placeholder="naam@voorbeeld.nl"
        aria-label="E-mailadres van de nieuwe beheerder"
        className={`${invoer} sm:flex-1`}
      />
      <button className={hoofdknop}>Toevoegen</button>
    </Formulier>
  );
}

export function RijActies({ id, email, isIkZelf, isLaatste }: { id: string; email: string; isIkZelf: boolean; isLaatste: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Formulier actie={stuurInlogLink} bevestig={`Een inloglink sturen naar ${email}?`} className="flex flex-col gap-1">
          <input type="hidden" name="gebruiker_id" value={id} />
          <button className={kleineKnop}>Inloglink sturen</button>
        </Formulier>
        {!isIkZelf && !isLaatste && (
          <Formulier
            actie={verwijderBeheerder}
            bevestig={`${email} verwijderen als beheerder? Het account blijft bestaan, maar heeft daarna geen toegang meer tot het beheer.`}
            className="flex flex-col gap-1"
          >
            <input type="hidden" name="gebruiker_id" value={id} />
            <button className={`${kleineKnop} text-red-700 dark:text-red-300`}>Verwijderen</button>
          </Formulier>
        )}
      </div>
    </div>
  );
}

export function WachtwoordFormulier({ email }: { email: string }) {
  return (
    <Formulier actie={wijzigWachtwoord} legenNaSucces className="flex flex-col gap-3">
      {/* Voor wachtwoordbeheerders: koppelt het nieuwe wachtwoord aan het juiste account. */}
      <input type="email" name="gebruikersnaam" value={email} autoComplete="username" readOnly hidden />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Nieuw wachtwoord (minstens {MIN_WACHTWOORD} tekens)</span>
        <input type="password" name="wachtwoord" required minLength={MIN_WACHTWOORD} autoComplete="new-password" className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Nieuw wachtwoord nog een keer</span>
        <input type="password" name="herhaling" required minLength={MIN_WACHTWOORD} autoComplete="new-password" className={invoer} />
      </label>
      <button className={`${hoofdknop} w-fit`}>Wachtwoord opslaan</button>
    </Formulier>
  );
}
