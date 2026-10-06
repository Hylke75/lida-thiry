import { vereisBeheerder } from "@/lib/admin-auth";
import { alleRelatieTags } from "@/lib/relaties/beheer";
import { AdminNav } from "../../AdminNav";
import { PAD } from "../ui";
import { ImportFormulier } from "./ImportFormulier";
import { tekstZacht } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function ImportPagina() {
  await vereisBeheerder("adresboek");
  const tags = await alleRelatieTags().catch(() => [] as string[]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/adresboek" />
      <AdminKop
        terug={{ href: PAD, label: "Adresboek" }}
        titel="Relaties importeren"
        beschrijving={
          <>
            Upload een CSV-bestand (bijvoorbeeld opgeslagen vanuit Excel) met een koprij. Herkende kolommen:{" "}
            <strong>email</strong> (verplicht), <strong>voornaam</strong>, <strong>achternaam</strong> of één kolom{" "}
            <strong>naam</strong>, <strong>telefoon</strong>, <strong>bedrijf</strong>, <strong>straat</strong> of{" "}
            <strong>adres</strong> (eventueel met een aparte kolom <strong>huisnummer</strong>), <strong>postcode</strong>,{" "}
            <strong>plaats</strong>, <strong>land</strong> en <strong>tags</strong> (meerdere gescheiden door <code>;</code>{" "}
            of <code>|</code>). Een export uit het adresboek kun je zo weer importeren.
          </>
        }
      >
        <p className={`text-sm ${tekstZacht}`}>
          Bestaat een e-mailadres al, dan worden alleen <strong>lege</strong> velden aangevuld en tags toegevoegd; wat er al
          staat, wordt nooit overschreven. Je ziet eerst een voorbeeld; er wordt pas iets opgeslagen als je op Importeren
          klikt. Let op: importeren in het adresboek meldt niemand aan voor de nieuwsbrief.
        </p>
      </AdminKop>
      <ImportFormulier tags={tags} />
    </main>
  );
}
