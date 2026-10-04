"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActief, toonSiteKop, type MenuItem } from "@/lib/paginas/beheer";

const LINK =
  "rounded-full px-3 py-2 text-sm text-foreground/75 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[current=page]:font-medium aria-[current=page]:text-accent";
const KNOP =
  "rounded-full bg-accent py-2 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** De zichtbare kop (zie SiteHeader). Client-component voor het actieve menu-item en het verbergen. */
export function SiteHeaderWeergave({
  paginas,
  siteNaam,
  logo,
}: {
  paginas: MenuItem[];
  siteNaam: string;
  /** Logo uit de website-instellingen; zonder logo staat de naam er als tekst. */
  logo: { url: string; alt: string } | null;
}) {
  const pad = usePathname();
  if (!toonSiteKop(pad)) return null;

  const items: MenuItem[] = [...paginas, { href: "/blog", label: "Blog" }];
  const huidig = (href: string) => (isActief(href, pad) ? ("page" as const) : undefined);

  return (
    <header className="border-b border-foreground/10 bg-background">
      <div className="relative mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          aria-current={pad === "/" ? "page" : undefined}
          className="flex shrink-0 items-center font-serif text-xl font-semibold tracking-tight hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo met vrije herkomst (mediabibliotheek of eigen adres)
            <img src={logo.url} alt={logo.alt} className="h-9 w-auto max-w-[11rem] object-contain sm:h-10 sm:max-w-[14rem]" />
          ) : (
            siteNaam
          )}
        </Link>

        {/* Groter scherm: alles op één rij. */}
        <nav aria-label="Hoofdmenu" className="hidden min-w-0 md:block">
          <ul className="flex flex-wrap items-center justify-end gap-x-1 gap-y-1">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} aria-current={huidig(i.href)} className={LINK}>
                  {i.label}
                </Link>
              </li>
            ))}
            <li className="ml-2">
              <Link href="/bestellen" aria-current={huidig("/bestellen")} className={`${KNOP} px-5`}>
                Doe de test
              </Link>
            </li>
          </ul>
        </nav>

        {/* Telefoon: knop naar de test plus een uitklapmenu. Sluit vanzelf bij navigeren (key). */}
        <div className="flex items-center gap-2 md:hidden">
          <Link href="/bestellen" aria-current={huidig("/bestellen")} className={`${KNOP} px-3.5 whitespace-nowrap`}>
            Doe de test
          </Link>
          <details key={pad} className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded-full border border-foreground/15 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
              <span aria-hidden="true" className="text-base leading-none group-open:hidden">
                ☰
              </span>
              <span aria-hidden="true" className="hidden text-base leading-none group-open:inline">
                ✕
              </span>
              <span className="max-[359px]:sr-only">Menu</span>
            </summary>
            <nav
              aria-label="Hoofdmenu"
              className="absolute inset-x-4 top-full z-30 mt-1 rounded-2xl bg-kaart p-2 shadow-lg ring-1 ring-foreground/10"
            >
              <ul className="flex flex-col">
                <li>
                  <Link href="/" aria-current={pad === "/" ? "page" : undefined} className={`${LINK} block rounded-xl px-4 py-3 text-base`}>
                    Home
                  </Link>
                </li>
                {items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} aria-current={huidig(i.href)} className={`${LINK} block rounded-xl px-4 py-3 text-base break-words`}>
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
