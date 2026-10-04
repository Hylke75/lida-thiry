import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { aiBeschikbaar } from "@/lib/blog/ai";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { kaart, knopRand, zacht } from "../../nieuwsbrief/_editor/stijl";
import { BlogKop } from "../_editor/onderdelen";
import { SchrijfFormulier } from "./SchrijfFormulier";

export const dynamic = "force-dynamic";
// Een volledig concept schrijven duurt al snel een minuut; de server action
// erft de maximale duur van deze pagina.
export const maxDuration = 300;

export default async function SchrijvenMetAi() {
  await vereisBeheerder("ai");
  const aan = aiBeschikbaar();
  const types = await haalLichaamstypes().catch(() => []);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <BlogKop actief="/admin/blog/ai" pad={[{ label: "Schrijven met AI" }]} />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">✨ Schrijven met AI</h1>
        <p className={`mt-1 text-sm ${zacht}`}>
          Geef een paar steekwoorden en de AI schrijft een eerste opzet in jouw stijl. Het resultaat is altijd een <strong>concept</strong>: niets
          komt online voordat jij het hebt gelezen, aangepast en gepubliceerd.
        </p>
      </div>

      {aan ? (
        <SchrijfFormulier figuurtypes={types.filter((t) => t.actief).map((t) => t.naam)} />
      ) : (
        <section className={kaart}>
          <h2 className="text-lg font-semibold">De AI-schrijfhulp staat nog uit</h2>
          <p className={`text-sm ${zacht}`}>
            Om hem aan te zetten moet er een API-sleutel van Anthropic (console.anthropic.com) worden ingesteld: in Vercel bij het project onder
            Settings → Environment Variables, met de naam <code>ANTHROPIC_API_KEY</code>. Publiceer de site daarna opnieuw. Je webbouwer kan dit
            voor je doen.
          </p>
          <Link href="/admin/blog" className={`${knopRand} w-fit`}>
            Terug naar de berichten
          </Link>
        </section>
      )}
    </main>
  );
}
