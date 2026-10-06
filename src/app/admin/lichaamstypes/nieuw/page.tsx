import { AdminKop } from "@/components/admin/AdminKop";
import { vereisBeheerder } from "@/lib/admin-auth";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { AdminNav } from "../../AdminNav";
import { LichaamstypeFormulier } from "../LichaamstypeFormulier";

export const dynamic = "force-dynamic";

export default async function NieuwLichaamstype() {
  await vereisBeheerder("advies");
  const types = await haalLichaamstypes();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/lichaamstypes" />
      <AdminKop
        terug={{ href: "/admin/lichaamstypes", label: "Alle lichaamstypes" }}
        titel="Nieuw lichaamstype"
        beschrijving="Vul de gegevens in. Na het aanmaken staan er 12 hand-outs klaar (één per categorie), leeg of met de inhoud van een bestaand type als startpunt. Koppel daarna op de overzichtspagina een uitkomst van de berekening aan dit type, zodat de test het kan uitwijzen."
      />
      <LichaamstypeFormulier bronnen={types.map((t) => ({ code: t.code, naam: t.naam }))} />
    </main>
  );
}
