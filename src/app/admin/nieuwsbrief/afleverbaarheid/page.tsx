import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { afzenderDomein, beoordeel, totaal, type Controle, type Oordeel } from "@/lib/nieuwsbrief/afleverbaarheid";
import { zoekDns } from "@/lib/nieuwsbrief/afleverbaarheid-dns";
import { AdminNav } from "../../AdminNav";

export const dynamic = "force-dynamic";

const TEKEN: Record<Oordeel, { teken: string; label: string; klasse: string }> = {
  goed: { teken: "✓", label: "In orde", klasse: "bg-green-600/15 text-green-800 dark:text-green-300" },
  "let-op": { teken: "!", label: "Let op", klasse: "bg-amber-500/20 text-amber-900 dark:text-amber-200" },
  ontbreekt: { teken: "✗", label: "Ontbreekt", klasse: "bg-red-600/15 text-red-800 dark:text-red-300" },
};

const TOTAAL_TEKST: Record<Oordeel, string> = {
  goed: "Alles staat goed. Je nieuwsbrieven hebben de beste kans om in de inbox te belanden.",
  "let-op": "Bijna goed: er is iets dat je beter kunt aanpassen.",
  ontbreekt: "Er ontbreken nog DNS-records. Mails kunnen daardoor in de spam belanden of worden geweigerd.",
};

function Badge({ oordeel }: { oordeel: Oordeel }) {
  const t = TEKEN[oordeel];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.klasse}`}>
      <span aria-hidden="true">{t.teken}</span>
      {t.label}
    </span>
  );
}

function ControleKaart({ c }: { c: Controle }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-medium">{c.label}</h2>
        <Badge oordeel={c.oordeel} />
      </div>
      <p className="text-sm text-black/70 dark:text-white/70">{c.uitleg}</p>
      {c.actie && (
        <div className="flex flex-col gap-1 rounded-xl bg-black/[0.03] p-3 text-sm dark:bg-white/[0.04]">
          <span className="font-medium">Toevoegen bij je domeinbeheerder:</span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-black/55 dark:text-white/55">Type</dt>
            <dd className="font-mono">{c.actie.type}</dd>
            <dt className="text-black/55 dark:text-white/55">Naam</dt>
            <dd className="font-mono break-all">{c.actie.naam}</dd>
            <dt className="text-black/55 dark:text-white/55">Waarde</dt>
            <dd className="font-mono break-all">{c.actie.waarde}</dd>
          </dl>
          {c.actie.toelichting && <p className="text-xs text-black/55 dark:text-white/55">{c.actie.toelichting}</p>}
        </div>
      )}
      {c.gevonden.length > 0 && (
        <details className="text-xs text-black/55 dark:text-white/55">
          <summary className="cursor-pointer">Gevonden in de DNS</summary>
          <ul className="mt-1 flex flex-col gap-0.5 font-mono break-all">
            {c.gevonden.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}

/**
 * Afleverbaarheid: staan SPF, DKIM, DMARC en de MX van het verzend-subdomein goed
 * voor het domein uit RESEND_VAN? Zoekt live in de DNS (bij elk bezoek).
 */
export default async function Afleverbaarheid() {
  await vereisBeheerder();
  const afzender = afzenderDomein(process.env.RESEND_VAN);
  const dns = afzender.soort === "eigen" ? await zoekDns(afzender.domein) : null;
  const controles = afzender.soort === "eigen" && dns ? beoordeel(afzender.domein, dns.gegevens) : [];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/nieuwsbrief/afleverbaarheid" />
      <div className="flex flex-col gap-2">
        <Link href="/admin/nieuwsbrief" className="text-sm text-accent underline underline-offset-4">
          ← Nieuwsbrief
        </Link>
        <h1 className="font-serif text-2xl">Afleverbaarheid van e-mail</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Om nieuwsbrieven en andere mails in de inbox te laten belanden (en niet in de spam), moet je domein laten zien dat
          Resend namens jou mag mailen. Dat doe je met een paar records in de DNS, bij de partij waar je domeinnaam staat
          (bijv. TransIP, Strato of Cloudflare). De precieze waarden vind je in het Resend-dashboard onder Domains.
        </p>
      </div>

      {afzender.soort === "standaard" && (
        <section className="flex flex-col gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          <h2 className="text-base font-medium">Nog geen eigen domein</h2>
          <p>
            Er wordt verzonden vanaf <span className="font-mono">{afzender.adres}</span>, het testadres van Resend. Daarmee
            kun je alleen naar je eigen Resend-account mailen; echte nieuwsbrieven komen niet aan.
          </p>
          <ol className="ml-5 list-decimal">
            <li>Voeg je domein toe in Resend → Domains en zet de getoonde DNS-records bij je domeinbeheerder.</li>
            <li>
              Zet in Vercel → Settings → Environment Variables <span className="font-mono">RESEND_VAN</span> op bijvoorbeeld{" "}
              <span className="font-mono">Lida Thiry &lt;info@jouwdomein.nl&gt;</span> en publiceer opnieuw.
            </li>
            <li>Kom hier terug om te controleren of alles goed staat.</li>
          </ol>
        </section>
      )}

      {afzender.soort === "geen" && (
        <p className="rounded-2xl border border-red-600/30 bg-red-600/10 p-4 text-sm">
          <span className="font-mono">RESEND_VAN</span> bevat geen geldig e-mailadres. Gebruik de vorm{" "}
          <span className="font-mono">Naam &lt;adres@domein.nl&gt;</span>.
        </p>
      )}

      {afzender.soort === "eigen" && dns && (
        <>
          <section
            aria-label="Totaaloordeel"
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15"
          >
            <Badge oordeel={totaal(controles)} />
            <p className="min-w-0 flex-1 text-sm">
              Afzender <span className="font-mono">{afzender.adres}</span> — {TOTAAL_TEKST[totaal(controles)]}
            </p>
          </section>
          {dns.fouten.length > 0 && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Niet alles kon worden opgezocht ({dns.fouten.join("; ")}). Probeer het later opnieuw.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {controles.map((c) => (
              <ControleKaart key={c.id} c={c} />
            ))}
          </ul>
          <p className="text-xs text-black/50 dark:text-white/50">
            Net iets aangepast? DNS-wijzigingen zijn soms pas na een paar minuten tot enkele uren overal zichtbaar. Ververs
            deze pagina om opnieuw te controleren.
          </p>
        </>
      )}
    </main>
  );
}
