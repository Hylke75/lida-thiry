import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesInstellingen } from "@/lib/instellingen";
import { siteUrl } from "@/lib/site";
import { WEBSITE_SLEUTELS, type WebsiteSleutel } from "@/lib/website/instellingen";
import { AdminNav } from "../AdminNav";
import { WebsiteFormulier } from "./WebsiteFormulier";

export const dynamic = "force-dynamic";

export default async function WebsiteInstellingenPagina() {
  await vereisBeheerder();
  const opgeslagen = await leesInstellingen();
  const begin = Object.fromEntries(WEBSITE_SLEUTELS.map((s) => [s, opgeslagen[s] ?? ""])) as Record<WebsiteSleutel, string>;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/teksten" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Instellingen website</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Naam, logo, pictogram, deelafbeelding en social media van de website. Lege velden gebruiken de standaard. De volgorde
          van de homepage stel je in bij{" "}
          <Link href="/admin/website/homepage" className="text-accent underline underline-offset-4">
            Homepage
          </Link>
          .
        </p>
      </div>
      <WebsiteFormulier begin={begin} siteUrl={siteUrl()} />
    </main>
  );
}
