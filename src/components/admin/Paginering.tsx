import Link from "next/link";

/**
 * Vorige/volgende-navigatie onder een lijst in het beheer. Toont niets bij één pagina.
 *
 * - `tekst`: "lang" ("Pagina 2 van 5"), "kort" ("2 / 5") of null (geen tekst).
 * - `uitKlasse`: zonder deze klasse staat er een lege plek als er geen vorige of
 *   volgende pagina is; met de klasse een uitgeschakelde knop met dezelfde tekst.
 */
export function Paginering({
  pagina,
  paginas,
  href,
  linkKlasse,
  navKlasse = "flex items-center justify-between text-sm",
  tekst = "lang",
  tekstKlasse,
  uitKlasse,
  vorige = "← Vorige",
  volgende = "Volgende →",
}: {
  pagina: number;
  paginas: number;
  /** Adres van een pagina (1-gebaseerd). */
  href: (pagina: number) => string;
  linkKlasse: string;
  navKlasse?: string;
  tekst?: "lang" | "kort" | null;
  tekstKlasse?: string;
  uitKlasse?: string;
  vorige?: string;
  volgende?: string;
}) {
  if (paginas <= 1) return null;
  const leeg = (label: string) => (uitKlasse === undefined ? <span /> : <span className={uitKlasse}>{label}</span>);
  return (
    <nav aria-label="Pagina's" className={navKlasse}>
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className={linkKlasse}>
          {vorige}
        </Link>
      ) : (
        leeg(vorige)
      )}
      {tekst === "lang" && (
        <span className={tekstKlasse}>
          Pagina {pagina} van {paginas}
        </span>
      )}
      {tekst === "kort" && (
        <span className={tekstKlasse}>
          {pagina} / {paginas}
        </span>
      )}
      {pagina < paginas ? (
        <Link href={href(pagina + 1)} className={linkKlasse}>
          {volgende}
        </Link>
      ) : (
        leeg(volgende)
      )}
    </nav>
  );
}
