import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesInstellingen } from "@/lib/instellingen";
import { siteUrl } from "@/lib/site";
import { WEBSITE_SLEUTELS, type WebsiteSleutel } from "@/lib/website/instellingen";
import { AdminNav } from "../AdminNav";
import { WebsiteFormulier } from "./WebsiteFormulier";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function WebsiteInstellingenPagina() {
  await vereisBeheerder("website_instellingen");
  const opgeslagen = await leesInstellingen();
  const begin = Object.fromEntries(WEBSITE_SLEUTELS.map((s) => [s, opgeslagen[s] ?? ""])) as Record<WebsiteSleutel, string>;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/website" />
      <AdminKop
        titel="Instellingen website"
        beschrijving={
          <>
            Naam, titels, zoekmachines, logo, pictogram, deelafbeelding, social media, bedrijfsgegevens voor Google, namen in blog
            en e-mail en de voettekst. Lege velden gebruiken de standaard. SEO van de vaste pagina&apos;s staat bij{" "}
            <Link href="/admin/website/seo" className="text-accent underline underline-offset-4">
              SEO
            </Link>
            . De volgorde
            van de homepage stel je in bij{" "}
            <Link href="/admin/website/homepage" className="text-accent underline underline-offset-4">
              Homepage
            </Link>
            .
          </>
        }
      />
      <WebsiteFormulier begin={begin} siteUrl={siteUrl()} />
    </main>
  );
}
