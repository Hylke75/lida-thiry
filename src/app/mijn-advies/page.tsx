import type { Metadata } from "next";
import Link from "next/link";
import { leesSectie } from "@/lib/inhoud/lees";
import { MIJN_ADVIES_PAGINA } from "@/lib/inhoud/groepen/mijn-advies";
import { Opmaak } from "@/components/Opmaak";
import { MijnAdviesFormulier } from "./MijnAdviesFormulier";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mijn advies opnieuw ontvangen",
  description: "Vraag de link naar je persoonlijke kledingadvies of je test opnieuw aan per e-mail.",
  alternates: { canonical: "/mijn-advies" },
};

export default async function MijnAdviesPage() {
  const t = await leesSectie(MIJN_ADVIES_PAGINA);
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-foreground/50 underline underline-offset-4 hover:text-accent">
          ← Terug
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.titel}</h1>
        <div className="mt-3 flex flex-col gap-3 text-foreground/70 [&_a]:text-accent [&_a]:underline">
          <Opmaak tekst={t.intro} />
        </div>
      </div>
      <div className="rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
        <MijnAdviesFormulier
          teksten={{ knop: t.knop, knopBezig: t.knopBezig, bevestiging: t.bevestiging, foutVerbinding: t.foutVerbinding }}
        />
      </div>
    </main>
  );
}
