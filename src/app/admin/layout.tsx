/**
 * Markeert het beheer (data-thema="beheer"): alleen hier geldt de donkere modus
 * (zie src/app/globals.css). De publieke site is altijd licht. `display: contents`
 * laat de opmaak van de pagina's ongemoeid.
 */
export default function BeheerLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div data-thema="beheer" className="contents">
      {children}
    </div>
  );
}
