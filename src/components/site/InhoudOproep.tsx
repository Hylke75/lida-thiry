import { Knop, KopTekst } from "./Basis";

/**
 * Een rustige oproep met één primaire knop (bijv. "Doe de test"), onder een
 * blogbericht of als {test}-blok op een pagina. Zacht koraal vlak, seriftitel.
 */
export function InhoudOproep({
  titel,
  tekst,
  knop,
  href = "/bestellen",
  kop = "h2",
}: {
  titel: string;
  tekst?: string;
  knop: string;
  href?: string;
  /** Kop als h2, of als p binnen lopende tekst waar geen nieuwe sectie begint. */
  kop?: "h2" | "p";
}) {
  const Kop = kop;
  return (
    <aside className="relative overflow-hidden rounded-ontwerp-lg border border-line bg-[#fff1ed] px-6 py-10 text-center tablet:px-12 tablet:py-12">
      <Kop className="mx-auto mt-0 mb-3 max-w-[560px] font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.015em] text-balance text-ink tablet:text-[38px]">
        <KopTekst tekst={titel} />
      </Kop>
      {tekst && <p className="mx-auto mt-0 mb-7 max-w-[520px] text-ink-soft">{tekst}</p>}
      <Knop href={href}>{knop}</Knop>
    </aside>
  );
}
