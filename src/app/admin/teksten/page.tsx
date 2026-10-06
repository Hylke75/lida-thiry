import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesAlleInhoud } from "@/lib/inhoud/lees";
import { GROEPEN } from "@/lib/inhoud/register";
import { AdminNav } from "../AdminNav";
import { AdminKop } from "@/components/admin/AdminKop";
import { kaartVlak } from "@/components/admin/stijl";

export const dynamic = "force-dynamic";

export default async function TekstenPagina() {
  await vereisBeheerder("teksten");
  const opgeslagen = await leesAlleInhoud();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/teksten" />
      <AdminKop
        titel="Teksten"
        beschrijving={
          <>
            Pas hier alle teksten van de site, de test en de e-mails aan. Zolang je niets wijzigt,
            gebruikt de site de standaardtekst; die kun je altijd terugzetten.
          </>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {GROEPEN.map((g) => {
          const aangepast = g.secties.filter((s) => opgeslagen.has(s.sleutel)).length;
          return (
            <li key={g.sleutel}>
              <Link
                href={`/admin/teksten/${g.sleutel}`}
                className={`${kaartVlak} flex h-full flex-col gap-2 hover:border-accent/40`}
              >
                <span className="text-lg font-semibold">{g.titel}</span>
                <span className="text-sm text-foreground/70">{g.omschrijving}</span>
                <span className="mt-auto pt-2 text-xs text-foreground/70">
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
