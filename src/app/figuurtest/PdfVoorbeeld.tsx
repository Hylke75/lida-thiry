// Getekend voorbeeld van de advies-PDF: een paar pagina's met een algemene kop en
// grijze balkjes in plaats van tekst. Bewust zonder echte inhoud: geen
// figuurtype, geen silhouet en geen advies (dat is alleen voor klanten).

/** Breedtes van de "regels" per pagina (in %), zodat de pagina's niet identiek ogen. */
const REGELS: readonly (readonly number[])[] = [
  [92, 78, 85, 64],
  [88, 95, 70, 82, 58],
  [80, 90, 66, 86],
  [94, 72, 84, 60, 76],
];

export function PdfVoorbeeld({ titel, koppen, onderschrift }: { titel: string; koppen: readonly string[]; onderschrift: string }) {
  const paginas = koppen.map((k) => k.trim()).filter(Boolean).slice(0, 4);
  if (!paginas.length) return null;
  return (
    <figure className="m-0 border border-line bg-paper p-5 tablet:p-8" aria-labelledby="pdf-voorbeeld-titel">
      <p id="pdf-voorbeeld-titel" className="mt-0 mb-5 text-[13px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
        {titel || "Zo ziet je advies eruit"}
      </p>
      <ul className="m-0 grid list-none grid-cols-2 gap-4 p-0 tablet:gap-5">
        {paginas.map((kop, i) => (
          <li key={i} className="flex aspect-[1/1.414] flex-col border border-line bg-white p-3 shadow-[0_6px_18px_rgba(47,36,65,.06)] tablet:p-5">
            <span aria-hidden="true" className="mb-3 block h-[3px] w-8 bg-berry" />
            <p className="mt-0 mb-3 text-[13px] leading-[1.3] font-bold text-ink tablet:text-[15px]">{kop}</p>
            <span aria-hidden="true" className="flex flex-col gap-2">
              {REGELS[i % REGELS.length].map((b, n) => (
                <span key={n} className="block h-[6px] rounded-full bg-line" style={{ width: `${b}%` }} />
              ))}
            </span>
            {/* Onderaan een rustig vlak: een tabel of tip, zonder inhoud. */}
            <span aria-hidden="true" className="mt-auto block h-[22%] border border-line bg-cream" />
          </li>
        ))}
      </ul>
      {onderschrift.trim() && <figcaption className="mt-5 text-[14px] leading-[1.5] text-ink-soft">{onderschrift}</figcaption>}
    </figure>
  );
}
