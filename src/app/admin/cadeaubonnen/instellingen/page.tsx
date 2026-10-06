import Link from "next/link";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstellingen, leesPrijsCent } from "@/lib/instellingen";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import {
  CADEAUBON_GRENZEN,
  CADEAUBON_SLEUTELS,
  CADEAUBON_STANDAARD,
  centNaarEuroInvoer,
  leesCadeaubonInstellingen,
  valideerCadeaubonInstellingen,
} from "@/lib/cadeaubon/regels";
import { formatteerBedrag } from "@/lib/prijs";
import { AdminNav } from "../../AdminNav";
import { ActieFormulier } from "../../types/ActieFormulier";
import type { Uitkomst } from "../../types/uitkomst";
import { invoer, invoerBreed, kaartVlak, knop, tekstUitleg } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const UITLEG: Record<string, string> = {
  [CADEAUBON_SLEUTELS.vasteBedragen]: "Vaste bedragen op het cadeaubonformulier (centen, komma-gescheiden).",
  [CADEAUBON_SLEUTELS.minCent]: "Minimaal bedrag van een cadeaubon (centen).",
  [CADEAUBON_SLEUTELS.maxCent]: "Maximaal bedrag van een cadeaubon (centen); nooit meer dan de prijs van de test.",
  [CADEAUBON_SLEUTELS.geldigMaanden]: "Zo lang (maanden) is een cadeaubon geldig na betaling of de geplande verzenddatum.",
  [CADEAUBON_SLEUTELS.maxVooruitDagen]: "Zo ver vooruit (dagen) mag een cadeaubon gepland worden.",
};

async function slaOp(_vorige: Uitkomst | null, fd: FormData): Promise<Uitkomst> {
  "use server";
  const ik = await vereisBeheerder("cadeaubon_instellingen");
  const v = valideerCadeaubonInstellingen({
    vaste_bedragen: fd.get("vaste_bedragen"),
    min: fd.get("min"),
    max: fd.get("max"),
    geldig_maanden: fd.get("geldig_maanden"),
    max_vooruit_dagen: fd.get("max_vooruit_dagen"),
  });
  if (!v.ok) return { ok: false, melding: v.fout, tijd: Date.now() };
  const huidig = await leesInstellingen();
  const wijzigingen = Object.entries(v.waarde.waarden).filter(([k, w]) => (huidig[k] ?? null) !== w);
  if (!wijzigingen.length) return { ok: true, melding: "Er was niets gewijzigd.", tijd: Date.now() };
  const { error } = await adminClient()
    .from("instellingen")
    .upsert(
      wijzigingen.map(([sleutel, waarde]) => ({ sleutel, waarde, omschrijving: UITLEG[sleutel] ?? null })),
      { onConflict: "sleutel" },
    );
  if (error) return { ok: false, melding: `Opslaan mislukt: ${error.message}`, tijd: Date.now() };
  await logActie({
    actie: "instellingen.cadeaubon",
    onderwerpSoort: "instellingen",
    omschrijving: `Cadeaubon-instellingen gewijzigd: ${wijzigingen.map(([k]) => k).join(", ")}`,
    details: { wijzigingen: wijzigingen.map(([k, w]) => ({ sleutel: k, van: huidig[k] ?? null, naar: w })) },
    gebruiker: ik,
  });
  vernieuwPubliekeData("instellingen");
  revalidatePath("/cadeaubon");
  revalidatePath("/admin/cadeaubonnen/instellingen");
  return { ok: true, melding: "Opgeslagen.", tijd: Date.now() };
}

export default async function CadeaubonInstellingenPagina() {
  await vereisBeheerder("cadeaubon_instellingen");
  const [inst, prijsCent] = await Promise.all([leesInstellingen(), leesPrijsCent().catch(() => null)]);
  const r = leesCadeaubonInstellingen(inst);
  const g = CADEAUBON_GRENZEN;
  const d = CADEAUBON_STANDAARD;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/cadeaubonnen/instellingen" />
      <AdminKop
        titel="Cadeaubon-instellingen"
        beschrijving={
          <>
            Bedragen en termijnen van de cadeaubonnen op <Link href="/cadeaubon" className="underline underline-offset-2">/cadeaubon</Link>.
            Een bon is één keer te gebruiken en dekt hooguit de prijs van de test
            {prijsCent ? ` (nu ${formatteerBedrag(prijsCent)})` : ""}: hogere bedragen worden op het formulier niet
            aangeboden.
          </>
        }
      />
      <ActieFormulier actie={slaOp} bewaakWijzigingen className={`${kaartVlak} flex flex-col gap-5`}>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Vaste bedragen (euro)</span>
          <input
            name="vaste_bedragen"
            defaultValue={r.vasteBedragen.map(centNaarEuroInvoer).join("; ")}
            placeholder="20; 35; 50"
            className={invoerBreed}
          />
          <span className={tekstUitleg}>
            Gescheiden door een puntkomma of spatie, hooguit {g.vasteBedragen}. Bedragen vanaf de prijs van de test vallen weg;
            de prijs zelf en ‘Ander bedrag’ staan er altijd bij. Standaard: {d.vasteBedragen.map(centNaarEuroInvoer).join("; ")}.
          </span>
        </label>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Minimaal bedrag (euro)</span>
            <input name="min" inputMode="decimal" defaultValue={centNaarEuroInvoer(r.minCent)} className={`${invoer} max-w-40`} />
            <span className={tekstUitleg}>
              Tussen {formatteerBedrag(g.bedragCent.min)} en {formatteerBedrag(g.bedragCent.max)}. Standaard{" "}
              {formatteerBedrag(d.minCent)}.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Maximaal bedrag (euro)</span>
            <input name="max" inputMode="decimal" defaultValue={centNaarEuroInvoer(r.maxCent)} className={`${invoer} max-w-40`} />
            <span className={tekstUitleg}>
              Bovengrens; het werkelijke maximum is altijd de prijs van de test. Standaard {formatteerBedrag(d.maxCent)}.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Geldigheid (maanden)</span>
            <input
              name="geldig_maanden"
              type="number"
              min={g.geldigMaanden.min}
              max={g.geldigMaanden.max}
              defaultValue={r.geldigMaanden}
              className={`${invoer} max-w-40`}
            />
            <span className={tekstUitleg}>
              Na betaling, of na de geplande verzenddatum. Geldt voor nieuwe bonnen. Standaard {d.geldigMaanden}.
            </span>
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">Maximaal vooruit plannen (dagen)</span>
            <input
              name="max_vooruit_dagen"
              type="number"
              min={g.maxVooruitDagen.min}
              max={g.maxVooruitDagen.max}
              defaultValue={r.maxVooruitDagen}
              className={`${invoer} max-w-40`}
            />
            <span className={tekstUitleg}>
              Zo ver vooruit kan een koper de bon naar de ontvanger laten sturen. Standaard {d.maxVooruitDagen} (een half jaar).
            </span>
          </label>
        </div>
        <div>
          <button className={knop}>Opslaan</button>
        </div>
      </ActieFormulier>
    </main>
  );
}
