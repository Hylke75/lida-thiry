import type { Metadata } from "next";
import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesInstellingen } from "@/lib/instellingen";
import { websiteInstellingen } from "@/lib/website/instellingen";
import { leesSeoPaginas } from "@/lib/website/seo";
import { AdminNav } from "../../AdminNav";
import { toon } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";
import { SeoFormulier } from "./SeoFormulier";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "SEO · Beheer" };

/** SEO van de vaste pagina's: titel, omschrijving, niet indexeren en in de sitemap. */
export default async function SeoPagina() {
  await vereisBeheerder("website_instellingen");
  const inst = await leesInstellingen();
  const site = websiteInstellingen(inst);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/website/seo" />
      <AdminKop
        titel="SEO vaste pagina's"
        beschrijving={
          <>
            Hoe de vaste pagina&apos;s van de site in Google en in het tabblad verschijnen. Lege velden gebruiken de standaard
            (grijs in het veld). De naam van de website komt automatisch achter elke titel. Je eigen pagina&apos;s en
            blogberichten hebben hun eigen SEO-velden; de homepage stel je in bij{" "}
            <Link href="/admin/website" className="text-accent underline underline-offset-4">
              Instellingen
            </Link>
            .
          </>
        }
      />
      {site.nietIndexeren && (
        <p className={`rounded-lg px-4 py-3 text-sm ${toon.amber}`}>
          &lsquo;Niet indexeren&rsquo; staat aan voor de hele website (
          <Link href="/admin/website#kop-zoekmachines" className="underline underline-offset-4">
            Instellingen
          </Link>
          ): zolang dat zo is, staat geen enkele pagina in zoekmachines of in de sitemap, wat je hieronder ook kiest.
        </p>
      )}
      <SeoFormulier begin={leesSeoPaginas(inst.seo_paginas)} siteNaam={site.korteNaam} />
    </main>
  );
}
