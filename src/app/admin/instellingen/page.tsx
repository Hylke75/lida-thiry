import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import {
  AFSPRAAK_INSTELLINGEN,
  CADEAUBON_INSTELLINGEN,
  INSTELLING_VELDEN,
  VEROUDERDE_INSTELLINGEN,
  WEBSITE_INSTELLINGEN,
  naarInvoer,
  vanInvoer,
  veldVoor,
  type InstellingVeld,
} from "@/lib/instelling-velden";
import { AdminNav, Melding } from "../AdminNav";
import { invoerBreed, kaartVlak, knop } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";
import { gratisTestAan } from "@/lib/order-status";

export const dynamic = "force-dynamic";

interface Rij {
  sleutel: string;
  waarde: string | null;
  omschrijving: string | null;
  /** Bekende sleutel die nog niet in de database staat (wordt bij opslaan aangemaakt). */
  nieuw?: boolean;
}

async function leesRijen(): Promise<Rij[]> {
  const { data, error } = await adminClient().from("instellingen").select("sleutel, waarde, omschrijving");
  if (error) throw new Error(`instellingen lezen: ${error.message}`);
  const bekend = Object.keys(INSTELLING_VELDEN);
  const positie = (s: string) => (bekend.includes(s) ? bekend.indexOf(s) : bekend.length);
  const rijen = (data ?? []) as Rij[];
  // Bekende instellingen die (nog) niet in de database staan, met hun standaardwaarde.
  const aanwezig = new Set(rijen.map((r) => r.sleutel));
  for (const [sleutel, veld] of Object.entries(INSTELLING_VELDEN)) {
    if (!aanwezig.has(sleutel)) rijen.push({ sleutel, waarde: veld.standaard ?? null, omschrijving: null, nieuw: true });
  }
  return rijen
    .filter(
      (r) =>
        !VEROUDERDE_INSTELLINGEN.has(r.sleutel) &&
        !WEBSITE_INSTELLINGEN.has(r.sleutel) &&
        !AFSPRAAK_INSTELLINGEN.has(r.sleutel) &&
        !CADEAUBON_INSTELLINGEN.has(r.sleutel),
    )
    .sort((a, b) => positie(a.sleutel) - positie(b.sleutel) || a.sleutel.localeCompare(b.sleutel));
}

async function slaOp(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("instellingen");
  const rijen = await leesRijen();
  const fouten: string[] = [];
  const wijzigingen: { sleutel: string; waarde: string | null; oud: string | null; nieuw: boolean; uitleg: string | null }[] = [];

  for (const r of rijen) {
    const invoer = formData.get(`veld:${r.sleutel}`);
    if (typeof invoer !== "string") continue;
    const veld = veldVoor(r.sleutel, r.omschrijving);
    const uitkomst = vanInvoer(veld, invoer);
    if (!uitkomst.ok) fouten.push(uitkomst.fout);
    // Een nieuwe sleutel altijd vastleggen (ook met de standaardwaarde).
    else if (uitkomst.waarde !== r.waarde || r.nieuw) {
      wijzigingen.push({
        sleutel: r.sleutel,
        waarde: uitkomst.waarde,
        oud: r.nieuw ? null : r.waarde,
        nieuw: Boolean(r.nieuw),
        uitleg: veld.uitleg ?? veld.label,
      });
    }
  }

  if (fouten.length) {
    redirect(`/admin/instellingen?fout=${encodeURIComponent(fouten.join("\n"))}`);
  }

  const supabase = adminClient();
  for (const w of wijzigingen) {
    // Upsert: ook bekende sleutels die nog niet in de database stonden worden opgeslagen.
    const { error } = await supabase
      .from("instellingen")
      .upsert(
        w.nieuw ? { sleutel: w.sleutel, waarde: w.waarde, omschrijving: w.uitleg } : { sleutel: w.sleutel, waarde: w.waarde },
        { onConflict: "sleutel" },
      );
    if (error) {
      redirect(`/admin/instellingen?fout=${encodeURIComponent(`Opslaan mislukt: ${error.message}`)}`);
    }
  }

  if (wijzigingen.length) {
    await logActie({
      actie: "instellingen.wijzigen",
      onderwerpSoort: "instellingen",
      omschrijving: `Instellingen gewijzigd: ${wijzigingen.map((w) => w.sleutel).join(", ")}`,
      details: { wijzigingen: wijzigingen.map((w) => ({ sleutel: w.sleutel, van: w.oud, naar: w.waarde })) },
      gebruiker: ik,
    });
  }

  // Instellingen (zoals de prijs) worden ook op openbare pagina's gebruikt.
  vernieuwPubliekeData("instellingen");
  revalidatePath("/", "layout");
  redirect(`/admin/instellingen?opgeslagen=${wijzigingen.length}`);
}

function Invoer({ naam, veld, waarde }: { naam: string; veld: InstellingVeld; waarde: string }) {
  switch (veld.soort) {
    case "keuze":
      return (
        <select id={naam} name={naam} defaultValue={waarde} className={invoerBreed}>
          {!veld.opties?.some((o) => o.waarde === waarde) && <option value="">— kies —</option>}
          {veld.opties?.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "tekstvak":
      return <textarea id={naam} name={naam} defaultValue={waarde} rows={3} className={invoerBreed} />;
    case "euro":
      return (
        <div className="flex items-center gap-2">
          <span className="text-foreground/70">€</span>
          <input id={naam} name={naam} defaultValue={waarde} inputMode="decimal" placeholder="29,95" className={`${invoerBreed} max-w-40`} />
        </div>
      );
    case "geheel_getal":
      return (
        <input
          id={naam}
          name={naam}
          type="number"
          min={veld.min}
          max={veld.max}
          step={1}
          defaultValue={waarde}
          className={`${invoerBreed} max-w-40`}
        />
      );
    case "email":
      return <input id={naam} name={naam} type="email" defaultValue={waarde} className={invoerBreed} />;
    default:
      return <input id={naam} name={naam} defaultValue={waarde} className={invoerBreed} />;
  }
}

export default async function InstellingenPagina({
  searchParams,
}: {
  searchParams: Promise<{ opgeslagen?: string; fout?: string }>;
}) {
  await vereisBeheerder("instellingen");
  const { opgeslagen, fout } = await searchParams;
  const rijen = await leesRijen();
  const gratisTest = gratisTestAan();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/instellingen" />
      <AdminKop
        titel="Instellingen"
        beschrijving={
          <>
            Pas hier de prijs, termijnen en je gegevens aan. Klik onderaan op &lsquo;Opslaan&rsquo;.
          </>
        }
      />

      {opgeslagen != null && !fout && (
        <Melding soort="ok">
          {opgeslagen === "0" ? "Er was niets gewijzigd." : "Je wijzigingen zijn opgeslagen."}
        </Melding>
      )}
      {fout && (
        <Melding soort="fout">
          <span className="block font-medium">Niet opgeslagen. Controleer het volgende:</span>
          {fout.split("\n").map((f) => (
            <span key={f} className="block">
              • {f}
            </span>
          ))}
        </Melding>
      )}

      <section className={`${kaartVlak} flex flex-col gap-1.5`} aria-labelledby="gratis-test">
        <h2 id="gratis-test" className="text-sm font-medium">
          Gratis testmodus: {gratisTest ? "aan" : "uit"}
        </h2>
        <p className="text-xs leading-relaxed text-foreground/70">
          {gratisTest
            ? "Bezoekers kunnen de test nu zonder betaling doen, en in Bestellingen staan knoppen om testbestellingen te maken en te verwijderen. Zet dit vóór de livegang uit."
            : "Iedereen betaalt via Mollie. Voor het testen kan de ontwikkelaar de gratis testmodus aanzetten."}{" "}
          Dit staat bewust niet als instelling in het beheer: het wordt alleen op de server geregeld (omgevingsvariabele
          GRATIS_TEST=1), zodat de test op de echte site nooit per ongeluk gratis wordt.
        </p>
      </section>

      {rijen.length === 0 ? (
        <p className="text-sm text-foreground/70">Er zijn nog geen instellingen.</p>
      ) : (
        <form action={slaOp} className={`${kaartVlak} flex flex-col gap-5`}>
          {rijen.map((r) => {
            const veld = veldVoor(r.sleutel, r.omschrijving);
            const naam = `veld:${r.sleutel}`;
            return (
              <div key={r.sleutel} className="flex flex-col gap-1.5">
                <label htmlFor={naam} className="text-sm font-medium">
                  {veld.label}
                </label>
                <Invoer naam={naam} veld={veld} waarde={naarInvoer(veld, r.waarde)} />
                {veld.uitleg && <p className="text-xs leading-relaxed text-foreground/70">{veld.uitleg}</p>}
              </div>
            );
          })}
          <div>
            <button className={knop}>
              Opslaan
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
