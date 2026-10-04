import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { lijstPrullenbak, type PrullenbakItem } from "@/lib/versies/beheer";
import { AdminNav, Melding } from "../../AdminNav";
import { PrullenbakKnoppen } from "./Knoppen";

export const dynamic = "force-dynamic";

const FOUTEN: Record<string, string> = {
  onbekend: "Onbekend onderdeel.",
  herstellen: "Herstellen is niet gelukt. Misschien is het al hersteld; kijk bij de pagina's of het blog.",
  wissen: "Wissen is niet gelukt. Probeer het opnieuw.",
};

export default async function Prullenbak({ searchParams }: { searchParams: Promise<{ fout?: string; gewist?: string }> }) {
  await vereisBeheerder("prullenbak");
  const sp = await searchParams;
  let items: PrullenbakItem[] = [];
  let laadFout: string | null = null;
  try {
    items = await lijstPrullenbak();
  } catch (e) {
    laadFout = e instanceof Error ? e.message : "onbekend";
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/versies/prullenbak" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Prullenbak</h1>
        <p className="text-sm text-black/55 dark:text-white/55">
          Verwijderde <Link href="/admin/paginas" className="underline underline-offset-4">pagina&apos;s</Link> en{" "}
          <Link href="/admin/blog" className="underline underline-offset-4">blogberichten</Link>. Met &quot;Herstellen&quot; komt de laatste versie terug als
          concept; is het webadres inmiddels in gebruik, dan krijgt het een nummer erachter (bijv. -2).
        </p>
      </div>

      {sp.fout && <Melding soort="fout">{FOUTEN[sp.fout] ?? "Er ging iets mis."}</Melding>}
      {sp.gewist && <Melding soort="ok">De geschiedenis is definitief gewist.</Melding>}
      {laadFout && <Melding soort="fout">De prullenbak kon niet worden geladen ({laadFout}).</Melding>}

      {!laadFout && items.length === 0 && (
        <p className="rounded-2xl border border-dashed border-black/15 px-5 py-8 text-center text-sm text-black/55 dark:border-white/20 dark:text-white/55">
          De prullenbak is leeg.
        </p>
      )}

      {items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((i) => (
            <li
              key={`${i.soort}:${i.ref}`}
              className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="break-words font-medium">
                  <span className="mr-2 rounded-full bg-black/5 px-2 py-0.5 text-xs font-normal dark:bg-white/10">{i.soort === "pagina" ? "Pagina" : "Blog"}</span>
                  {i.titel}
                </p>
                <p className="break-all text-xs text-black/55 dark:text-white/55">
                  {i.soort === "pagina" ? `/${i.slug}` : `/blog/${i.slug}`} · laatste versie {toonDatumTijd(i.op)}
                  {i.door ? ` door ${i.door}` : ""} · {i.aantalVersies} versie{i.aantalVersies === 1 ? "" : "s"}
                </p>
              </div>
              <PrullenbakKnoppen versieId={i.versieId} soort={i.soort} refId={i.ref} titel={i.titel} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
