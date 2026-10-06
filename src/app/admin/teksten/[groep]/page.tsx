import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesAlleInhoud } from "@/lib/inhoud/lees";
import { vindGroep } from "@/lib/inhoud/register";
import { combineer } from "@/lib/inhoud/schema";
import { AdminNav } from "../../AdminNav";
import { SectieEditor } from "../SectieEditor";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function GroepPagina({ params }: { params: Promise<{ groep: string }> }) {
  await vereisBeheerder("teksten");
  const { groep: sleutel } = await params;
  const groep = vindGroep(sleutel);
  if (!groep) notFound();
  const opgeslagen = await leesAlleInhoud();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/teksten" />
      <AdminKop
        terug={{ href: "/admin/teksten", label: "Alle teksten" }}
        titel={`Teksten: ${groep.titel}`}
        beschrijving={groep.omschrijving}
        acties={
          groep.bekijkUrl && (
            <a href={groep.bekijkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline underline-offset-4">
              Bekijk op de site ↗
            </a>
          )
        }
      />

      {groep.secties.length > 1 && (
        <nav aria-label="Onderdelen" className="flex flex-wrap gap-1.5 text-sm">
          {groep.secties.map((s) => (
            <a
              key={s.sleutel}
              href={`#${s.sleutel.replace(/\./g, "-")}`}
              className="rounded-full border border-black/10 px-3 py-1 text-black/70 hover:border-accent/40 dark:border-white/15 dark:text-white/70"
            >
              {s.titel}
            </a>
          ))}
        </nav>
      )}

      {groep.secties.map((s) => (
        <SectieEditor
          key={s.sleutel}
          sectie={s}
          beginWaarden={combineer(s, opgeslagen.get(s.sleutel))}
          beginAangepast={opgeslagen.has(s.sleutel)}
        />
      ))}
    </main>
  );
}
