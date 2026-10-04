import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesAlleInhoud } from "@/lib/inhoud/lees";
import { GROEPEN } from "@/lib/inhoud/register";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";

export default async function TekstenPagina() {
  await vereisBeheerder("teksten");
  const opgeslagen = await leesAlleInhoud();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/teksten" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Teksten</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Pas hier alle teksten van de site, de test en de e-mails aan. Zolang je niets wijzigt,
          gebruikt de site de standaardtekst; die kun je altijd terugzetten.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {GROEPEN.map((g) => {
          const aangepast = g.secties.filter((s) => opgeslagen.has(s.sleutel)).length;
          return (
            <li key={g.sleutel}>
              <Link
                href={`/admin/teksten/${g.sleutel}`}
                className="flex h-full flex-col gap-2 rounded-2xl border border-black/10 bg-kaart p-5 hover:border-accent/40 dark:border-white/15"
              >
                <span className="text-lg font-semibold">{g.titel}</span>
                <span className="text-sm text-black/60 dark:text-white/60">{g.omschrijving}</span>
                <span className="mt-auto pt-2 text-xs text-black/50 dark:text-white/50">
                  {g.secties.length} onderdelen · {aangepast} met eigen tekst
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
