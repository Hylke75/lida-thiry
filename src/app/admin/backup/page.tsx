import type { ReactNode } from "react";
import type { Metadata } from "next";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { leesbareGrootte } from "@/lib/backup/formaat";
import { telOpslag, telTabellen } from "@/lib/backup/maken";
import { BACKUP_TABELLEN, NIET_IN_BACKUP } from "@/lib/backup/tabellen";
import { AdminNav, Melding } from "../AdminNav";
import { BackupControle } from "./BackupControle";
import { kaart, knop } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Back-up · Beheer" };

const HANDLEIDING = "https://github.com/Hylke75/lida-thiry/blob/main/docs/backup-en-herstel.md";

function Kaart({ titel, children }: { titel: string; children: ReactNode }) {
  return (
    <section className={kaart}>
      <h2 className="text-lg">{titel}</h2>
      {children}
    </section>
  );
}

export default async function BackupPagina() {
  await vereisBeheerder("backup");
  const supabase = adminClient();
  const [tellingen, opslag] = await Promise.all([
    telTabellen(supabase),
    telOpslag(supabase).catch((e: unknown) => ({ buckets: [], fout: e instanceof Error ? e.message : String(e) })),
  ]);
  const rijen = Object.values(tellingen).reduce<number>((n, a) => n + (a ?? 0), 0);
  const nietTeLezen = BACKUP_TABELLEN.filter((t) => tellingen[t.naam] === null).map((t) => t.naam);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/backup" />
      <AdminKop
        titel="Back-up"
        beschrijving={
          <>
            Afhankelijk van het abonnement maakt Supabase zelf back-ups (Pro: dagelijks; gratis: geen). Hier download je
            daarnaast een eigen kopie van alle gegevens, bijvoorbeeld wekelijks en vóór een grote wijziging. Hoe je een
            back-up terugzet staat in de{" "}
            <a href={HANDLEIDING} target="_blank" rel="noreferrer" className="underline underline-offset-4">
              handleiding back-up en herstel
            </a>
            .
          </>
        }
      />

      <Kaart titel="Volledige back-up downloaden">
        <p className="text-sm text-black/70 dark:text-white/70">
          Eén bestand (gecomprimeerde JSON) met alle {BACKUP_TABELLEN.length} tabellen, nu{" "}
          {rijen.toLocaleString("nl-NL")} rijen, plus een overzicht met aantallen en tijdstip. Het bestand bevat
          persoonsgegevens van klanten: bewaar het veilig (versleutelde schijf of wachtwoordkluis) en verwijder oude
          kopieën.
        </p>
        {nietTeLezen.length > 0 && (
          <Melding soort="fout">
            Niet te lezen (ontbreekt een migratie?): {nietTeLezen.join(", ")}. Deze tabellen komen leeg in de back-up.
          </Melding>
        )}
        <div>
          {/* Gewone link: de route streamt een bestand. */}
          <a href="/admin/backup/download" className={`${knop} inline-block`} download>
            Download volledige back-up
          </a>
        </div>
        <details className="text-sm">
          <summary className="cursor-pointer text-foreground/70">Wat zit er wel en niet in?</summary>
          <div className="mt-2 flex flex-col gap-2 text-black/70 dark:text-white/70">
            <p>
              Wel: {BACKUP_TABELLEN.map((t) => t.naam).join(", ")}.
            </p>
            <p>
              Niet:{" "}
              {Object.entries(NIET_IN_BACKUP)
                .map(([naam, reden]) => `${naam} (${reden})`)
                .join("; ")}
              ; inloggegevens van beheerders (die beheert Supabase Auth).
            </p>
            <p>
              Ook niet: de bestanden in de opslag (advies-PDF&apos;s, facturen, afbeeldingen). Die zijn te groot voor
              één download; Supabase bewaart ze los van de database. Het overzicht hieronder staat ook in de back-up,
              zodat je kunt zien wat er destijds was.
            </p>
          </div>
        </details>
      </Kaart>

      <Kaart titel="Opslag (niet in de back-up)">
        {opslag.fout ? (
          <Melding soort="fout">Opslag tellen mislukt: {opslag.fout}</Melding>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 text-sm dark:divide-white/10">
            {opslag.buckets.map((b) => (
              <li key={b.naam} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span className="font-mono text-xs">
                  {b.naam}
                  {b.publiek && <span className="ml-2 font-sans text-black/40 dark:text-white/40">(openbaar)</span>}
                </span>
                <span className="tabular-nums text-foreground/70">
                  {b.bestanden.toLocaleString("nl-NL")} {b.bestanden === 1 ? "bestand" : "bestanden"},{" "}
                  {leesbareGrootte(b.bytes)}
                  {b.onvolledig && " (onvolledig geteld)"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Kaart>

      <Kaart titel="Back-up controleren">
        <p className="text-sm text-black/70 dark:text-white/70">
          Kies een eerder gedownload back-upbestand. Het wordt in je browser gecontroleerd (niet geüpload) en de aantallen
          worden naast die van nu gezet. Terugzetten gebeurt nooit vanuit het beheer: zie de handleiding.
        </p>
        <BackupControle />
      </Kaart>
    </main>
  );
}
