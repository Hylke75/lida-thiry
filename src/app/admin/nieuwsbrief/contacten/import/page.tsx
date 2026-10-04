import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { alleTags } from "@/lib/nieuwsbrief/beheer";
import { AdminNav } from "../../../AdminNav";
import { ImportFormulier } from "./ImportFormulier";

export const dynamic = "force-dynamic";

export default async function ImportPagina() {
  await vereisBeheerder();
  const tags = await alleTags().catch(() => [] as string[]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav />
      <header className="flex flex-col gap-2">
        <Link href="/admin/nieuwsbrief/contacten" className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">
          ← Alle contacten
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Contacten importeren</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Upload een CSV-bestand (bijvoorbeeld opgeslagen vanuit Excel) met een kolom <strong>email</strong> en eventueel{" "}
          <strong>naam</strong> en <strong>tags</strong> (meerdere tags gescheiden door <code>;</code> of <code>|</code>).
          Een koprij is handig maar niet verplicht. Je ziet eerst een voorbeeld; er wordt pas iets opgeslagen als je op
          Importeren klikt.
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">
          Importeer alleen mensen die <strong>zelf toestemming</strong> hebben gegeven om je nieuwsbrief te ontvangen.
          Adressen die zich hebben afgemeld, onbestelbaar zijn of je mail als spam hebben gemeld, worden overgeslagen.
        </p>
      </header>
      <ImportFormulier tags={tags} />
    </main>
  );
}
