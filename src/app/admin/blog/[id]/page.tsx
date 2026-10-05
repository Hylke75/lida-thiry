import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { aiBeschikbaar } from "@/lib/blog/ai";
import { uniekGesorteerd } from "@/lib/blog/beheer";
import { zichtbaarheid } from "@/lib/blog/regels";
import { standaardInplanmoment } from "@/lib/datum";
import { siteUrl } from "@/lib/site";
import { Melding } from "../../AdminNav";
import { BlogEditor } from "../_editor/BlogEditor";
import { BlogKop } from "../_editor/onderdelen";
import { haalBericht } from "../_editor/server";

export const dynamic = "force-dynamic";
// De AI-knoppen in de editor (server actions) kunnen 30–90 seconden duren; die
// erven de maximale duur van deze pagina.
export const maxDuration = 300;

const FOUTEN: Record<string, string> = {
  "nieuwsbrief-concept": "Een nieuwsbrief maken kan pas als het bericht online staat of is ingepland.",
  nieuwsbrief: "De nieuwsbriefcampagne kon niet worden aangemaakt. Probeer het opnieuw.",
};

export default async function BlogBewerken({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ai?: string; nieuw?: string; gekopieerd?: string; fout?: string; hersteld?: string }>;
}) {
  await vereisBeheerder("blog");
  const { id } = await params;
  const sp = await searchParams;
  const bericht = await haalBericht(id);
  if (!bericht) notFound();

  const { data } = await adminClient().from("blog_berichten").select("categorie, tags").limit(1000);
  const rijen = (data ?? []) as { categorie: string | null; tags: string[] }[];

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <BlogKop actief="/admin/blog" pad={[{ href: "/admin/blog", label: "Berichten" }, { label: bericht.titel }]} />
      {sp.ai && (
        <p role="status" className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-950 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100">
          <strong>Concept door AI geschreven</strong> — lees en controleer alles, vervang de [foto: …]-regels door echte foto&apos;s, en publiceer pas
          daarna.
        </p>
      )}
      {sp.nieuw && <Melding soort="ok">Nieuw concept aangemaakt. Begin met een titel en schrijf je tekst; vergeet niet op te slaan.</Melding>}
      {sp.hersteld && <Melding soort="ok">Het bericht is teruggezet uit de prullenbak, als concept. Controleer het en publiceer opnieuw als dat nodig is.</Melding>}
      {sp.gekopieerd && <Melding soort="ok">Kopie gemaakt. Dit is een nieuw concept; het origineel is niet veranderd.</Melding>}
      {sp.fout && <Melding soort="fout">{FOUTEN[sp.fout] ?? "Er ging iets mis."}</Melding>}
      <BlogEditor
        key={bericht.id}
        bericht={bericht}
        beginZichtbaar={zichtbaarheid(bericht)}
        categorieen={uniekGesorteerd(rijen.map((r) => r.categorie))}
        bekendeTags={uniekGesorteerd(rijen.flatMap((r) => r.tags))}
        aiAan={aiBeschikbaar()}
        site={siteUrl()}
        standaardMoment={standaardInplanmoment()}
      />
    </main>
  );
}
