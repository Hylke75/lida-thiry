import { vereisBeheerder } from "@/lib/admin-auth";
import { alleRelatieTags } from "@/lib/relaties/beheer";
import { AdminNav } from "../../AdminNav";
import { RelatieFormulier } from "../RelatieFormulier";
import { PAD } from "../ui";
import { kaart } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function NieuweRelatiePagina() {
  await vereisBeheerder("adresboek");
  const tags = await alleRelatieTags().catch(() => [] as string[]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/adresboek" />
      <AdminKop
        terug={{ href: PAD, label: "Adresboek" }}
        titel="Nieuwe relatie"
      />
      <section className={kaart}>
        <RelatieFormulier relatie={null} tags={tags} />
      </section>
    </main>
  );
}
