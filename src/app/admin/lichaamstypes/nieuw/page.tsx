import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { AdminNav } from "../../AdminNav";
import { LichaamstypeFormulier } from "../LichaamstypeFormulier";

export const dynamic = "force-dynamic";

export default async function NieuwLichaamstype() {
  await vereisBeheerder();
  const types = await haalLichaamstypes();
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/lichaamstypes" />
      <Link href="/admin/lichaamstypes" className="text-sm text-black/60 underline-offset-4 hover:underline dark:text-white/60">
        ← Alle lichaamstypes
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nieuw lichaamstype</h1>
        <p className="max-w-2xl text-sm text-black/60 dark:text-white/60">
          Vul de gegevens in. Na het aanmaken staan er 12 hand-outs klaar (één per categorie), leeg of met de inhoud van een
          bestaand type als startpunt. Koppel daarna op de overzichtspagina een uitkomst van de berekening aan dit type,
          zodat de test het kan uitwijzen.
        </p>
      </div>
      <LichaamstypeFormulier bronnen={types.map((t) => ({ code: t.code, naam: t.naam }))} />
    </main>
  );
}
