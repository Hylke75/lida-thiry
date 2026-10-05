import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { AdminNav } from "../../AdminNav";
import { haalSoorten } from "@/lib/afspraken/data";
import { duurLabel, MAX } from "@/lib/afspraken/regels";
import { vandaagAmsterdam } from "@/lib/datum";
import { maakAfspraak } from "../acties";
import { invoer, kaart, knop, Meldingen, NAV_AFSPRAKEN, zacht } from "../stijl";

export const dynamic = "force-dynamic";

export default async function NieuweAfspraak({ searchParams }: { searchParams: Promise<{ ok?: string; fout?: string }> }) {
  await vereisBeheerder("afspraken");
  const { ok, fout } = await searchParams;
  const soorten = await haalSoorten(false).catch(() => []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief={NAV_AFSPRAKEN} />
      <Link href="/admin/afspraken" className={`text-sm ${zacht} underline-offset-4 hover:underline`}>
        ← Alle afspraken
      </Link>
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Afspraak inplannen</h1>
        <p className={`text-sm ${zacht}`}>
          Bijvoorbeeld na een telefoontje. Je kunt hier ook buiten je vaste beschikbaarheid plannen; er komt geen aanbetaling bij.
        </p>
      </header>
      <Meldingen ok={ok} fout={fout} />

      {soorten.length === 0 ? (
        <p className="text-sm">
          Maak eerst een soort afspraak aan bij{" "}
          <Link href="/admin/afspraken/instellingen" className="text-accent underline underline-offset-4">
            Instellingen
          </Link>
          .
        </p>
      ) : (
        <form action={maakAfspraak} className={`${kaart} grid grid-cols-1 gap-4 sm:grid-cols-2`}>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className={zacht}>Soort afspraak *</span>
            <select name="soort" required className={invoer} defaultValue={soorten.find((s) => s.actief)?.id ?? soorten[0].id}>
              {soorten.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.naam} ({duurLabel(s.duur_minuten)}){s.actief ? "" : " – inactief"}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Datum *</span>
            <input type="date" name="datum" required min={vandaagAmsterdam(new Date())} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Begintijd *</span>
            <input type="time" name="tijd" required step={300} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Duur in minuten (leeg = duur van de soort)</span>
            <input type="number" name="duur" min={5} max={720} step={5} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Status</span>
            <select name="status" defaultValue="bevestigd" className={invoer}>
              <option value="bevestigd">Bevestigd</option>
              <option value="aangevraagd">Aangevraagd (nog bevestigen)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Naam *</span>
            <input name="naam" required maxLength={MAX.naam} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>E-mailadres *</span>
            <input name="email" type="email" required maxLength={MAX.email} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className={zacht}>Telefoon</span>
            <input name="telefoon" type="tel" maxLength={MAX.telefoon} className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className={zacht}>Opmerking (bijv. wat de klant al vertelde)</span>
            <textarea name="opmerking" rows={3} maxLength={MAX.opmerking} className={invoer} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="mail" defaultChecked className="accent-accent" />
            Stuur de klant een bevestiging met agendabestand (alleen bij ‘Bevestigd’)
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="toch" className="accent-accent" />
            Toch inplannen als de tijd overlapt met een andere afspraak of blokkade
          </label>
          <div className="sm:col-span-2">
            <button className={knop}>Inplannen</button>
          </div>
        </form>
      )}
    </main>
  );
}
