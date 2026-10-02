import Link from "next/link";
import type { ReactNode } from "react";

/** Gemeenschappelijke opmaak voor de voorwaarden en de privacyverklaring. */
export function JuridischePagina({
  titel,
  bijgewerkt,
  children,
}: {
  titel: string;
  bijgewerkt: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-foreground/50 underline underline-offset-4 hover:text-accent"
      >
        ← Terug naar de startpagina
      </Link>
      <p className="rounded-lg border border-accent/30 bg-accent-zacht px-4 py-3 text-sm font-medium text-accent">
        Concept — laten controleren. Deze tekst is een concept en moet nog juridisch
        worden nagekeken en aangevuld (zie de gegevens tussen [blokhaken]).
      </p>
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titel}</h1>
        <p className="mt-2 text-sm text-foreground/50">Laatst bijgewerkt: {bijgewerkt}</p>
      </header>
      <div className="flex flex-col gap-4 leading-relaxed text-foreground/80 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}

/** Identiteitsblok van de ondernemer, met duidelijk gemarkeerde placeholders. */
export function Identiteit() {
  return (
    <div className="rounded-xl bg-kaart p-5 text-sm ring-1 ring-foreground/10">
      <p className="font-semibold text-foreground">Lida Thiry Imago &amp; Kledingadvies</p>
      <p>Eigenaar: Lida Thiry</p>
      <p>Adres: [adres], [postcode] [plaats]</p>
      <p>E-mail: [e-mailadres]</p>
      <p>Telefoon: [telefoonnummer]</p>
      <p>KvK-nummer: [KvK-nummer]</p>
      <p>Btw-identificatienummer: [btw-id]</p>
    </div>
  );
}
