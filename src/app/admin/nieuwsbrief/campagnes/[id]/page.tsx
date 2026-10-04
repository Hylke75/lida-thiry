import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { haalCampagne } from "@/lib/nieuwsbrief/verzenden";
import { standaardInplanmoment } from "@/lib/nieuwsbrief/tijd";
import { Melding } from "../../../AdminNav";
import { alsInhoud, laadEditorContext } from "../../_editor/laden";
import { NieuwsbriefKop, StatusBadge } from "../../_editor/onderdelen";
import { CampagneEditor } from "./CampagneEditor";

export const dynamic = "force-dynamic";
// Verzenden start een eerste ronde mails na het antwoord (after()); geef die de tijd.
export const maxDuration = 300;

export default async function CampagnePagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gekopieerd?: string }>;
}) {
  const gebruiker = await vereisBeheerder();
  const { id } = await params;
  const { gekopieerd } = await searchParams;
  if (!UUID_PATROON.test(id)) notFound();
  const c = await haalCampagne(id);
  if (!c) notFound();
  if (c.soort === "automatisch") redirect(`/admin/nieuwsbrief/automatisch/${id}`);

  const context = await laadEditorContext(true);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <NieuwsbriefKop actief="/admin/nieuwsbrief/campagnes" pad={[{ href: "/admin/nieuwsbrief/campagnes", label: "Campagnes" }, { label: c.naam }]} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{c.naam}</h1>
          <StatusBadge status={c.status} />
        </div>
        {c.status !== "concept" && c.status !== "ingepland" && (
          <Link href={`/admin/nieuwsbrief/campagnes/${id}/rapport`} className="text-sm text-accent underline underline-offset-4">
            Rapport bekijken →
          </Link>
        )}
      </div>
      {gekopieerd && <Melding soort="ok">Kopie gemaakt. Pas de kopie aan en verstuur hem wanneer je wilt.</Melding>}
      <CampagneEditor
        id={id}
        status={c.status}
        ingeplandOp={c.ingepland_op}
        maxPerDag={context.maxPerDag}
        standaardMoment={standaardInplanmoment()}
        beginInhoud={alsInhoud(c)}
        afzender={context.afzender}
        tags={context.tags}
        typen={context.typen}
        testAdres={gebruiker.email ?? ""}
      />
    </main>
  );
}
