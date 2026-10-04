import Link from "next/link";
import type { ReactNode } from "react";
import { leesPubliekeInstellingen } from "@/lib/instellingen";

/** Gemeenschappelijke opmaak voor de voorwaarden en de privacyverklaring. */
export function JuridischePagina({
  titel,
  bijgewerkt,
  concept,
  children,
}: {
  titel: string;
  bijgewerkt: string;
  /** Toon de conceptmelding (zolang er nog [invulplekken] in de tekst staan). */
  concept: boolean;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-6 py-12">
      <Link
        href="/"
        className="text-sm text-foreground/70 underline underline-offset-4 hover:text-accent"
      >
        ← Terug naar de startpagina
      </Link>
      {concept && (
      <p className="rounded-lg border border-accent/30 bg-accent-zacht px-4 py-3 text-sm font-medium text-accent">
        Concept — laten controleren. Deze tekst is een concept en moet nog juridisch
        worden nagekeken en aangevuld (zie de gegevens tussen [blokhaken]).
      </p>
      )}
      <header>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{titel}</h1>
        <p className="mt-2 text-sm text-foreground/70">Laatst bijgewerkt: {bijgewerkt}</p>
      </header>
      <div className="flex flex-col gap-4 leading-relaxed text-foreground/80 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6">
        {children}
      </div>
    </main>
  );
}

/**
 * Identiteitsblok van de ondernemer, gevuld uit de instellingen (Beheer → Instellingen).
 * Wat nog niet is ingevuld, blijft zichtbaar als gemarkeerde placeholder.
 */
/** Het contact-e-mailadres uit de instellingen, of een zichtbare invulplek. */
export async function contactEmail(): Promise<string> {
  const inst = await leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>);
  return inst.contact_email?.trim() || "[e-mailadres]";
}

export async function Identiteit() {
  const inst = await leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>);
  const waarde = (sleutel: string, placeholder: string) => inst[sleutel]?.trim() || placeholder;
  return (
    <div className="rounded-xl bg-kaart p-5 text-sm ring-1 ring-foreground/10">
      <p className="font-semibold text-foreground">
        {waarde("bedrijfsnaam", "Lida Thiry Imago & Kledingadvies")}
      </p>
      <p>Eigenaar: Lida Thiry</p>
      <p className="whitespace-pre-line">Adres: {waarde("bedrijf_adres", "[adres], [postcode] [plaats]")}</p>
      <p>E-mail: {waarde("contact_email", "[e-mailadres]")}</p>
      <p>KvK-nummer: {waarde("kvk_nummer", "[KvK-nummer]")}</p>
      <p>Btw-identificatienummer: {waarde("btw_nummer", "[btw-id]")}</p>
    </div>
  );
}
