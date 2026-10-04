import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { siteUrl } from "@/lib/site";
import { Melding } from "../../AdminNav";
import { PaginaEditor } from "../_editor/PaginaEditor";
import { PaginaKop } from "../_editor/PaginaKop";
import { haalFormulieren, haalPaginaBeheer } from "../_editor/server";

export const dynamic = "force-dynamic";

export default async function PaginaBewerken({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nieuw?: string; gekopieerd?: string; sjabloon?: string; hersteld?: string }>;
}) {
  await vereisBeheerder();
  const { id } = await params;
  const sp = await searchParams;
  const [pagina, formulieren] = await Promise.all([haalPaginaBeheer(id), haalFormulieren()]);
  if (!pagina) notFound();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <PaginaKop pad={[{ label: pagina.titel }]} />
      {sp.nieuw && <Melding soort="ok">Nieuwe pagina aangemaakt (concept). Geef hem een titel en schrijf je tekst; vergeet niet op te slaan.</Melding>}
      {sp.sjabloon && (
        <Melding soort="ok">
          Startpagina aangemaakt als concept. Vul de plekken met [aan te vullen: …] in met je eigen gegevens en lees alles na voordat je publiceert.
        </Melding>
      )}
      {sp.hersteld && <Melding soort="ok">De pagina is teruggezet uit de prullenbak, als concept. Controleer hem en publiceer opnieuw als dat nodig is.</Melding>}
      {sp.gekopieerd && <Melding soort="ok">Kopie gemaakt. Dit is een nieuw concept; het origineel is niet veranderd.</Melding>}
      <PaginaEditor key={pagina.id} pagina={pagina} formulieren={formulieren} site={siteUrl()} />
    </main>
  );
}
