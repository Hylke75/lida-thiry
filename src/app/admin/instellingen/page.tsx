import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import {
  AFSPRAAK_INSTELLINGEN,
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
    .filter(
      (r) =>
        !VEROUDERDE_INSTELLINGEN.has(r.sleutel) && !WEBSITE_INSTELLINGEN.has(r.sleutel) && !AFSPRAAK_INSTELLINGEN.has(r.sleutel),
    )
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
