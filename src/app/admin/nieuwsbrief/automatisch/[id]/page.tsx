import { notFound, redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { haalCampagne } from "@/lib/nieuwsbrief/verzenden";
import { Melding } from "../../../AdminNav";
import { alsInhoud, laadEditorContext } from "../../_editor/laden";
import { ActiefBadge, NieuwsbriefKop } from "../../_editor/onderdelen";
import { AutomatischEditor } from "./AutomatischEditor";

export const dynamic = "force-dynamic";

export default async function AutomatischPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nieuw?: string }>;
}) {
  const gebruiker = await vereisBeheerder("nieuwsbrief");
  const { id } = await params;
  const { nieuw } = await searchParams;
  if (!UUID_PATROON.test(id)) notFound();
  const c = await haalCampagne(id);
  if (!c) notFound();
  if (c.soort !== "automatisch") redirect(`/admin/nieuwsbrief/campagnes/${id}`);
  const context = await laadEditorContext(false);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <NieuwsbriefKop actief="/admin/nieuwsbrief/automatisch" pad={[{ href: "/admin/nieuwsbrief/automatisch", label: "Automatische mails" }, { label: c.naam }]} />
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{c.naam}</h1>
        <ActiefBadge actief={c.actief} />
      </div>
      {nieuw && (
        <Melding soort="ok">
          Aangemaakt. Pas de tekst naar wens aan, sla op, stuur jezelf een testmail en zet de mail daarna aan.
        </Melding>
      )}
      <AutomatischEditor id={id} actief={c.actief} beginInhoud={alsInhoud(c)} afzender={context.afzender} testAdres={gebruiker.email ?? ""} />
    </main>
  );
}
