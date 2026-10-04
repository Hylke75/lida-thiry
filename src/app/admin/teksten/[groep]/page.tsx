import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesAlleInhoud } from "@/lib/inhoud/lees";
import { vindGroep } from "@/lib/inhoud/register";
import { combineer } from "@/lib/inhoud/schema";
import { AdminNav } from "../../AdminNav";
import { SectieEditor } from "../SectieEditor";

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
      <div className="flex flex-col gap-2">
        <Link href="/admin/teksten" className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">
          ← Alle teksten
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Teksten: {groep.titel}</h1>
          {groep.bekijkUrl && (
            <a href={groep.bekijkUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline underline-offset-4">
              Bekijk op de site ↗
            </a>
          )}
        </div>
        <p className="text-sm text-black/60 dark:text-white/60">{groep.omschrijving}</p>
      </div>

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
