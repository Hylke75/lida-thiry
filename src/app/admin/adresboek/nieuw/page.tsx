import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { alleRelatieTags } from "@/lib/relaties/beheer";
import { AdminNav } from "../../AdminNav";
import { RelatieFormulier } from "../RelatieFormulier";
import { heelZacht, kaart, PAD } from "../ui";

export const dynamic = "force-dynamic";

export default async function NieuweRelatiePagina() {
  await vereisBeheerder();
  const tags = await alleRelatieTags().catch(() => [] as string[]);
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/adresboek" />
      <header className="flex flex-col gap-1">
        <Link href={PAD} className={`text-sm underline underline-offset-4 ${heelZacht}`}>
          ← Adresboek
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Nieuwe relatie</h1>
      </header>
      <section className={kaart}>
        <RelatieFormulier relatie={null} tags={tags} />
      </section>
    </main>
  );
}
