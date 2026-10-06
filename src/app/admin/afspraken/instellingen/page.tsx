import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { AdminNav } from "../../AdminNav";
import { afspraakInstellingen, haalBeschikbaarheid, haalBlokkades, haalSoorten } from "@/lib/afspraken/data";
import { bedragLabel, centNaarEuroInvoer, duurLabel, type AfspraakSoort } from "@/lib/afspraken/regels";
import { datumLabel, tijdLabel, vandaagAmsterdam } from "@/lib/datum";
import {
  bewaarAlgemeen,
  bewaarBeschikbaarheid,
  bewaarSoort,
  verwijderBlokkade,
  verwijderSoort,
  voegBlokkadeToe,
} from "../acties";
import { Meldingen, NAV_AFSPRAKEN_INSTELLINGEN } from "../onderdelen";
import { BeschikbaarheidEditor } from "./BeschikbaarheidEditor";
import { invoer, kaart, knop, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

function SoortVelden({ s }: { s?: AfspraakSoort }) {
  return (
    <>
      {s && <input type="hidden" name="id" value={s.id} />}
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className={tekstZacht}>Naam *</span>
        <input name="naam" required maxLength={120} defaultValue={s?.naam} placeholder="Bijv. Kleuradvies" className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        <span className={tekstZacht}>Omschrijving (zichtbaar bij het boeken)</span>
        <textarea name="omschrijving" rows={2} maxLength={2000} defaultValue={s?.omschrijving} className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Duur (minuten) *</span>
        <input name="duur_minuten" type="number" required min={10} max={480} step={5} defaultValue={s?.duur_minuten ?? 60} className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Buffer erna (minuten)</span>
        <input name="buffer_minuten" type="number" min={0} max={240} step={5} defaultValue={s?.buffer_minuten ?? 15} className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Prijs (€, 0 = gratis/niet tonen)</span>
        <input name="prijs" inputMode="decimal" defaultValue={s ? centNaarEuroInvoer(s.prijs_cent) : ""} placeholder="0,00" className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Aanbetaling (€, 0 = geen)</span>
        <input
          name="aanbetaling"
          inputMode="decimal"
          defaultValue={s ? centNaarEuroInvoer(s.aanbetaling_cent) : ""}
          placeholder="0,00"
          className={invoer}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Locatie</span>
        <input name="locatie" maxLength={300} defaultValue={s?.locatie} placeholder="Adres, of ‘Online (videobellen)’" className={invoer} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className={tekstZacht}>Volgorde</span>
        <input name="volgorde" type="number" defaultValue={s?.volgorde ?? 0} className={invoer} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="online" defaultChecked={s?.online ?? false} className="accent-accent" />
        Online afspraak
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="actief" defaultChecked={s?.actief ?? true} className="accent-accent" />
        Actief (te boeken)
      </label>
    </>
  );
}

export default async function AfspraakInstellingen({ searchParams }: { searchParams: Promise<{ ok?: string; fout?: string }> }) {
  await vereisBeheerder("afspraken");
  const { ok, fout } = await searchParams;
  const nu = new Date();
  const [soorten, beschikbaarheid, blokkades, inst] = await Promise.all([
    haalSoorten(false).catch(() => []),
    haalBeschikbaarheid().catch(() => []),
    haalBlokkades(new Date(nu.getTime() - 86_400_000), new Date(nu.getTime() + 5 * 365 * 86_400_000)).catch(() => []),
    afspraakInstellingen(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-4 sm:p-8">
      <AdminNav actief={NAV_AFSPRAKEN_INSTELLINGEN} />
      <AdminKop
        terug={{ href: "/admin/afspraken", label: "Afspraken" }}
        titel="Instellingen voor afspraken"
        beschrijving={
          <>
            De teksten van het formulier en de mails pas je aan in{" "}
            <Link href="/admin/teksten/afspraken" className="underline underline-offset-4">
              Teksten → Afspraken
            </Link>
            . Alle tijden zijn Nederlandse tijd.
          </>
        }
      />

      <Meldingen ok={ok} fout={fout} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Soorten afspraken</h2>
        {soorten.length === 0 && <p className={`text-sm ${tekstZacht}`}>Nog geen soorten. Voeg er hieronder een toe.</p>}
        <ul className="flex flex-col gap-2">
          {soorten.map((s) => (
            <li key={s.id}>
              <details className="rounded-xl border border-black/10 bg-kaart dark:border-white/15">
                <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span className="font-medium">
                    {s.naam}
                    {!s.actief && <span className={`ml-2 text-xs ${tekstZacht}`}>(inactief)</span>}
                  </span>
                  <span className={tekstZacht}>
                    {duurLabel(s.duur_minuten)}
                    {s.prijs_cent ? ` · ${bedragLabel(s.prijs_cent)}` : ""}
                    {s.aanbetaling_cent ? ` · aanbetaling ${bedragLabel(s.aanbetaling_cent)}` : ""}
                  </span>
                </summary>
                <div className="flex flex-col gap-3 border-t border-black/10 p-4 dark:border-white/15">
                  <form action={bewaarSoort} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SoortVelden s={s} />
                    <div className="sm:col-span-2">
                      <button className={knop}>Opslaan</button>
                    </div>
                  </form>
                  <form action={verwijderSoort} className="flex justify-end">
                    <input type="hidden" name="id" value={s.id} />
                    <button className="text-xs text-red-700 underline underline-offset-4 dark:text-red-300">Soort verwijderen</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
        <details className={kaart}>
          <summary className="cursor-pointer font-medium">+ Nieuwe soort afspraak</summary>
          <form action={bewaarSoort} className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <SoortVelden />
            <div className="sm:col-span-2">
              <button className={knop}>Toevoegen</button>
            </div>
          </form>
        </details>
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Vaste beschikbaarheid</h2>
        <p className={`text-sm ${tekstZacht}`}>
          Per weekdag een of meer tijdblokken. Een afspraak moet helemaal binnen één blok passen; begintijden liggen op hele kwartieren.
        </p>
        <BeschikbaarheidEditor begin={beschikbaarheid} actie={bewaarBeschikbaarheid} />
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Vrije dagen en blokkades</h2>
        <p className={`text-sm ${tekstZacht}`}>Op deze momenten kan er niet geboekt worden (vakantie, cursus, …). Zonder tijden geldt de hele dag.</p>
        {blokkades.length > 0 && (
          <ul className="flex flex-col gap-2">
            {blokkades.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
                <span>
                  <span className="first-letter:uppercase">{datumLabel(b.van)}</span> {tijdLabel(b.van)} – {datumLabel(b.tot)} {tijdLabel(b.tot)}
                  {b.reden && <span className={tekstZacht}> · {b.reden}</span>}
                </span>
                <form action={verwijderBlokkade}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-xs text-red-700 underline underline-offset-4 dark:text-red-300">Verwijderen</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={voegBlokkadeToe} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Van datum *</span>
            <input type="date" name="van_datum" required min={vandaagAmsterdam(nu)} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Vanaf tijd</span>
            <input type="time" name="van_tijd" className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Tot en met datum</span>
            <input type="date" name="tot_datum" min={vandaagAmsterdam(nu)} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Tot tijd</span>
            <input type="time" name="tot_tijd" className={invoer} />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm sm:col-span-3">
            <span className={tekstZacht}>Reden (alleen voor jezelf)</span>
            <input name="reden" maxLength={200} placeholder="Bijv. vakantie" className={invoer} />
          </label>
          <div className="col-span-2 flex items-end sm:col-span-1">
            <button className={knopSecundair}>Toevoegen</button>
          </div>
        </form>
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Boekingsregels</h2>
        <form action={bewaarAlgemeen} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Minimaal vooraf boeken (uren)</span>
            <input type="number" name="min_vooraf_uren" min={0} max={1440} required defaultValue={inst.minVoorafUren} className={invoer} />
            <span className={`text-xs ${tekstZacht}`}>Geldt ook voor zelf annuleren door de klant.</span>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={tekstZacht}>Maximaal vooruit boeken (dagen)</span>
            <input type="number" name="max_vooruit_dagen" min={1} max={730} required defaultValue={inst.maxVooruitDagen} className={invoer} />
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="handmatig" defaultChecked={inst.handmatigBevestigen} className="mt-1 accent-accent" />
            <span>
              Afspraken zonder aanbetaling handmatig bevestigen
              <span className={`block text-xs ${tekstZacht}`}>
                De klant krijgt dan eerst een ontvangstbevestiging; jij bevestigt de afspraak in het beheer. Met aanbetaling is een afspraak na betaling altijd bevestigd.
              </span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <button className={knop}>Opslaan</button>
          </div>
        </form>
      </section>
    </main>
  );
}
