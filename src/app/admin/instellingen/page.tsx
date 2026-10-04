import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import {
  INSTELLING_VELDEN,
  VEROUDERDE_INSTELLINGEN,
  WEBSITE_INSTELLINGEN,
  naarInvoer,
  vanInvoer,
  veldVoor,
  type InstellingVeld,
} from "@/lib/instelling-velden";
import { AdminNav, Melding } from "../AdminNav";

export const dynamic = "force-dynamic";

interface Rij {
  sleutel: string;
  waarde: string | null;
  omschrijving: string | null;
}

async function leesRijen(): Promise<Rij[]> {
  const { data, error } = await adminClient().from("instellingen").select("sleutel, waarde, omschrijving");
  if (error) throw new Error(`instellingen lezen: ${error.message}`);
  const bekend = Object.keys(INSTELLING_VELDEN);
  const positie = (s: string) => (bekend.includes(s) ? bekend.indexOf(s) : bekend.length);
  return ((data ?? []) as Rij[])
    .filter((r) => !VEROUDERDE_INSTELLINGEN.has(r.sleutel) && !WEBSITE_INSTELLINGEN.has(r.sleutel))
    .sort((a, b) => positie(a.sleutel) - positie(b.sleutel) || a.sleutel.localeCompare(b.sleutel));
}

async function slaOp(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("instellingen");
  const rijen = await leesRijen();
  const fouten: string[] = [];
  const wijzigingen: { sleutel: string; waarde: string | null; oud: string | null }[] = [];

  for (const r of rijen) {
    const invoer = formData.get(`veld:${r.sleutel}`);
    if (typeof invoer !== "string") continue;
    const uitkomst = vanInvoer(veldVoor(r.sleutel, r.omschrijving), invoer);
    if (!uitkomst.ok) fouten.push(uitkomst.fout);
    else if (uitkomst.waarde !== r.waarde) wijzigingen.push({ sleutel: r.sleutel, waarde: uitkomst.waarde, oud: r.waarde });
  }

  if (fouten.length) {
    redirect(`/admin/instellingen?fout=${encodeURIComponent(fouten.join("\n"))}`);
  }

  const supabase = adminClient();
  for (const w of wijzigingen) {
    const { error } = await supabase.from("instellingen").update({ waarde: w.waarde }).eq("sleutel", w.sleutel);
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

const invoerKlasse =
  "w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 outline-none focus:border-accent dark:border-white/20";

function Invoer({ naam, veld, waarde }: { naam: string; veld: InstellingVeld; waarde: string }) {
  switch (veld.soort) {
    case "keuze":
      return (
        <select id={naam} name={naam} defaultValue={waarde} className={invoerKlasse}>
          {!veld.opties?.some((o) => o.waarde === waarde) && <option value="">— kies —</option>}
          {veld.opties?.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "tekstvak":
      return <textarea id={naam} name={naam} defaultValue={waarde} rows={3} className={invoerKlasse} />;
    case "euro":
      return (
        <div className="flex items-center gap-2">
          <span className="text-black/60 dark:text-white/60">€</span>
          <input id={naam} name={naam} defaultValue={waarde} inputMode="decimal" placeholder="29,95" className={`${invoerKlasse} max-w-40`} />
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
          className={`${invoerKlasse} max-w-40`}
        />
      );
    case "email":
      return <input id={naam} name={naam} type="email" defaultValue={waarde} className={invoerKlasse} />;
    default:
      return <input id={naam} name={naam} defaultValue={waarde} className={invoerKlasse} />;
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/instellingen" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Instellingen</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Pas hier de prijs, termijnen en je gegevens aan. Klik onderaan op &lsquo;Opslaan&rsquo;.
        </p>
      </div>

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

      {rijen.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Er zijn nog geen instellingen.</p>
      ) : (
        <form action={slaOp} className="flex flex-col gap-5 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15">
          {rijen.map((r) => {
            const veld = veldVoor(r.sleutel, r.omschrijving);
            const naam = `veld:${r.sleutel}`;
            return (
              <div key={r.sleutel} className="flex flex-col gap-1.5">
                <label htmlFor={naam} className="text-sm font-medium">
                  {veld.label}
                </label>
                <Invoer naam={naam} veld={veld} waarde={naarInvoer(veld, r.waarde)} />
                {veld.uitleg && <p className="text-xs leading-relaxed text-black/50 dark:text-white/50">{veld.uitleg}</p>}
              </div>
            );
          })}
          <div>
            <button className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">
              Opslaan
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
