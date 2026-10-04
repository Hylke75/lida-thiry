import { vereisBeheerder } from "@/lib/admin-auth";
import { leesSectieVers } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { alleTags } from "@/lib/nieuwsbrief/beheer";
import { alleFormulieren } from "@/lib/nieuwsbrief/formulieren";
import { STANDAARD_FORMULIER } from "@/lib/nieuwsbrief/formulierregels";
import { FormulierEditor } from "../FormulierEditor";
import { FormulierenKop } from "../Kop";

export const dynamic = "force-dynamic";

export default async function NieuwFormulier() {
  await vereisBeheerder("nieuwsbrief");
  const [teksten, tags, formulieren] = await Promise.all([
    leesSectieVers(NIEUWSBRIEF_AANMELDEN),
    alleTags().catch(() => [] as string[]),
    alleFormulieren().catch(() => []),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <FormulierenKop pad={[{ href: "/admin/nieuwsbrief/formulieren", label: "Formulieren" }, { label: "Nieuw" }]} />
      <h1 className="text-2xl font-semibold tracking-tight">Nieuw aanmeldformulier</h1>
      <FormulierEditor
        id={null}
        begin={{ ...STANDAARD_FORMULIER, succes_tekst: teksten.succes || STANDAARD_FORMULIER.succes_tekst }}
        andereSlugs={formulieren.map((f) => f.slug)}
        tagSuggesties={tags}
        standaard={teksten}
      />
    </main>
  );
}
