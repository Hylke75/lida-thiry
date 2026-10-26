import { vereisBeheerder } from "@/lib/admin-auth";
import { haalRekenmodel } from "@/lib/lichaamstypes";
import { AdminNav } from "../AdminNav";
import { AdminKop } from "@/components/admin/AdminKop";
import { kaart } from "@/components/admin/stijl";
import { Proefberekening, RekenmodelFormulier } from "./Formulieren";

export const dynamic = "force-dynamic";

/**
 * Beheer → Rekentool: kies de rekenmethode van de test (FFIT of die van Lida),
 * stel de grenzen van Lida's methode bij en toets ze met een proefberekening.
 */
export default async function RekentoolPagina() {
  await vereisBeheerder("advies");
  const rekenmodel = await haalRekenmodel();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/rekentool" />
      <AdminKop
        titel="Rekentool"
        beschrijving={
          <>
            Hoe de test het silhouet bepaalt. Naast de FFIT-methode is er nu jouw eigen methode: omtrekken in procenten, het
            breedste punt in de spiegel (V of H, X of Lepel), de vorm van de heup (Lepel of Peer) en de handentest voor het
            bovenlichaam. Toets je methode eerst met de proefberekening op maten van je eigen klanten, en zet hem pas daarna
            aan.
          </>
        }
      />

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Proefberekening</h2>
        <p className="text-sm text-foreground/70">
          Vul de maten van een klant in en zie wat beide methodes zeggen, met de grenzen die nu zijn opgeslagen. Er wordt
          niets bewaard.
        </p>
        <Proefberekening />
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Methode en grenzen</h2>
        <p className="text-sm text-foreground/70">
          De zandloper-grens (25% kleiner) is van jou; de andere grenzen zijn een voorstel. Pas ze aan tot de
          proefberekening klopt met jouw oordeel. Wijzigingen gelden voor nieuwe tests.
        </p>
        <RekenmodelFormulier model={rekenmodel.model} grenzen={rekenmodel.grenzen} />
      </section>
    </main>
  );
}
