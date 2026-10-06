import Link from "next/link";
import { letterNaam, type LetterKeuze } from "@/lib/adviestypes-beheer";
import { toonDatumTijd } from "@/lib/datum";
import { AdminKop } from "@/components/admin/AdminKop";
import { knop, tekstZacht } from "@/components/admin/stijl";
import type { Type } from "./regels";

/** Navigatie naar het vorige/volgende type. */
export function TypeNavigatie({ vorige, volgende }: { vorige: { sleutel: string } | null; volgende: { sleutel: string } | null }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <Link
        href="/admin/types"
        className="text-foreground/70 underline-offset-4 hover:underline"
      >
        ← Alle adviestypes
      </Link>
      <span className="flex gap-3 text-foreground/70">
        {vorige && (
          <Link
            href={`/admin/types/${vorige.sleutel}`}
            className="underline-offset-4 hover:underline"
          >
            ← {vorige.sleutel}
          </Link>
        )}
        {volgende && (
          <Link
            href={`/admin/types/${volgende.sleutel}`}
            className="underline-offset-4 hover:underline"
          >
            {volgende.sleutel} →
          </Link>
        )}
      </span>
    </div>
  );
}

/** Paginakop met titel, kerngegevens en de knop naar de voorbeeld-PDF, plus de uitleg eronder. */
export function TypeKop({
  type,
  letters,
  ingevuld,
  aantalVelden,
  aantalBeelden,
}: {
  type: Type;
  letters: LetterKeuze[];
  ingevuld: number;
  aantalVelden: number;
  aantalBeelden: number;
}) {
  return (
    <>
      <AdminKop
        titel={type.titel}
        beschrijving={
          <>
            Type {type.sleutel} · categorie {type.categorie} · {letterNaam(type.letter, letters)}
          </>
        }
        acties={
          <a href={`/admin/types/${type.sleutel}/voorbeeld`} target="_blank" rel="noopener" className={knop}>
            Voorbeeld-PDF bekijken ↗
          </a>
        }
      >
        <p className={`text-xs ${tekstZacht}`}>
          {ingevuld} van {aantalVelden} velden ingevuld · {aantalBeelden} beelden · laatst bewerkt{" "}
          {toonDatumTijd(type.bijgewerkt_op)}
        </p>
      </AdminKop>

      <div className="rounded-xl bg-accent-zacht px-4 py-3 text-sm leading-relaxed">
        <p>
          <strong>Goed om te weten:</strong> wijzigingen gelden voor PDF&rsquo;s
          die vanaf nu worden gemaakt. PDF&rsquo;s die al zijn verstuurd,
          veranderen niet.
        </p>
        <p className="mt-1">
          Elk type heeft dezelfde vaste velden, in dezelfde volgorde als in de
          PDF. Sla elk veld op met de knop <em>Opslaan</em> onder dat veld. Met{" "}
          <em>Voorbeeld-PDF bekijken</em> zie je (in een nieuw tabblad) hoe de
          hand-out eruitziet met de opgeslagen tekst.
        </p>
      </div>
    </>
  );
}
