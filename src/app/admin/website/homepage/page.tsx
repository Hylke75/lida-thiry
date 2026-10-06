import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesInstelling } from "@/lib/instellingen";
import { normaliseerIndeling } from "@/lib/website/homepage";
import { AdminNav } from "../../AdminNav";
import { HomepageIndeling } from "./HomepageIndeling";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function HomepagePagina() {
  await vereisBeheerder("homepage");
  const indeling = normaliseerIndeling(await leesInstelling("homepage_indeling"));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/website/homepage" />
      <AdminKop
        titel="Homepage"
        beschrijving={
          <>
            Bepaal de volgorde van de blokken op de homepage en welke zichtbaar zijn. Het blok bovenaan blijft altijd staan. De
            teksten van een blok pas je aan via &lsquo;Teksten bewerken&rsquo;; naam en logo bij{" "}
            <Link href="/admin/website" className="text-accent underline underline-offset-4">
              Instellingen website
            </Link>
            .
          </>
        }
      />
      <HomepageIndeling begin={indeling} />
    </main>
  );
}
