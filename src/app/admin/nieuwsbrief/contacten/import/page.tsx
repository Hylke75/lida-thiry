import { vereisBeheerder } from "@/lib/admin-auth";
import { alleTags } from "@/lib/nieuwsbrief/beheer";
import { AdminNav } from "../../../AdminNav";
import { ImportFormulier } from "./ImportFormulier";
import { AdminKop } from "@/components/admin/AdminKop";
import { tekstZacht } from "@/components/admin/stijl";

export const dynamic = "force-dynamic";

export default async function ImportPagina() {
  await vereisBeheerder("nieuwsbrief_contacten");
  const tags = await alleTags().catch(() => [] as string[]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/nieuwsbrief/contacten" />
      <AdminKop
        terug={{ href: "/admin/nieuwsbrief/contacten", label: "Alle contacten" }}
        titel="Contacten importeren"
        beschrijving={
          <>
            Upload een CSV-bestand (bijvoorbeeld opgeslagen vanuit Excel) met een kolom <strong>email</strong> en eventueel{" "}
            <strong>naam</strong> en <strong>tags</strong> (meerdere tags gescheiden door <code>;</code> of <code>|</code>).
            Een koprij is handig maar niet verplicht. Je ziet eerst een voorbeeld; er wordt pas iets opgeslagen als je op
            Importeren klikt.
          </>
        }
      >
        <p className={`text-sm ${tekstZacht}`}>
          Importeer alleen mensen die <strong>zelf toestemming</strong> hebben gegeven om je nieuwsbrief te ontvangen.
          Adressen die zich hebben afgemeld, onbestelbaar zijn of je mail als spam hebben gemeld, worden overgeslagen.
        </p>
      </AdminKop>
      <ImportFormulier tags={tags} />
    </main>
  );
}
