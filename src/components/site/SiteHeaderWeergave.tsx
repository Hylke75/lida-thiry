"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isActief, toonSiteKop, type MenuItem } from "@/lib/paginas/beheer";
import { Knop } from "./Basis";
import { CONTAINER } from "./stijl";
import { Woordmerk, type LogoGegevens } from "./Woordmerk";

const MENU_ID = "hoofdmenu";

/**
 * De zichtbare kop (zie SiteHeader). Client-component voor het actieve
 * menu-item, het uitklapmenu en het verbergen in beheer, inloggen en test.
 *
 * Tot 980 px klapt het menu uit onder de knop "Menu" (aria-expanded/-controls).
 * Het sluit bij navigeren, met Escape (focus terug op de knop) en bij een klik
 * ernaast. Tot 640 px staat de kop niet vast en zit de knop rechtsboven in het menu.
 */
export function SiteHeaderWeergave({
  items,
  naam,
  subregel,
  logo,
  knop,
}: {
  items: readonly MenuItem[];
  naam: string;
  subregel: string;
  logo: LogoGegevens | null;
  knop: { tekst: string; href: string };
}) {
  const pad = usePathname();
  // Open "op" een pad: na navigeren is het menu vanzelf weer dicht.
  const [openOp, setOpenOp] = useState<string | null>(null);
  const open = openOp !== null && openOp === pad;
  const kopRef = useRef<HTMLElement>(null);
  const knopRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const toets = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpenOp(null);
      knopRef.current?.focus();
    };
    const klik = (e: PointerEvent) => {
      if (kopRef.current && !kopRef.current.contains(e.target as Node)) setOpenOp(null);
    };
    document.addEventListener("keydown", toets);
    document.addEventListener("pointerdown", klik);
    return () => {
      document.removeEventListener("keydown", toets);
      document.removeEventListener("pointerdown", klik);
    };
  }, [open]);

  if (!toonSiteKop(pad)) return null;
  const huidig = (href: string) => (isActief(href, pad) ? ("page" as const) : undefined);

  return (
    <>
      <a
        href="#inhoud"
        className="fixed top-4 left-[-9999px] z-[999] bg-ink px-4 py-3 font-bold text-white focus:left-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-berry"
      >
        Ga naar inhoud
      </a>
      <header
        ref={kopRef}
        className="relative top-0 z-50 border-b border-[rgba(234,223,214,.75)] bg-[rgba(255,253,249,.94)] backdrop-blur-[16px] tablet:sticky"
      >
        <div
          className={`${CONTAINER} grid min-h-[72px] grid-cols-[1fr_auto] items-center gap-7 tablet:min-h-[82px] tablet:grid-cols-[auto_auto_1fr] desktop:grid-cols-[auto_1fr_auto]`}
        >
          <Link
            href="/"
            aria-current={pad === "/" ? "page" : undefined}
            className="inline-flex min-h-11 items-center justify-self-start rounded-sm"
          >
            <Woordmerk naam={naam} subregel={subregel} logo={logo} />
          </Link>

          <button
            ref={knopRef}
            type="button"
            aria-expanded={open}
            aria-controls={MENU_ID}
            onClick={() => setOpenOp(open ? null : pad)}
            className="min-h-11 cursor-pointer justify-self-end rounded-sm border-0 bg-transparent px-1 font-bold text-ink desktop:hidden"
          >
            Menu
          </button>

          <nav
            id={MENU_ID}
            aria-label="Hoofdmenu"
            className={`${open ? "block" : "hidden"} absolute top-[76px] right-5 left-5 rounded-2xl bg-white p-5 shadow-ontwerp desktop:static desktop:block desktop:rounded-none desktop:bg-transparent desktop:p-0 desktop:shadow-none`}
          >
            <ul className="flex flex-col items-start gap-x-7 gap-y-1 text-[15px] font-semibold desktop:flex-row desktop:flex-wrap desktop:items-center desktop:justify-center">
              {items.map((i) => (
                <li key={i.href}>
                  <Link href={i.href} aria-current={huidig(i.href)} className="group inline-flex min-h-11 items-center rounded-sm">
                    <span className="relative after:absolute after:-bottom-[7px] after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-coral after:transition-transform after:duration-200 after:content-[''] group-hover:after:scale-x-100 group-aria-[current=page]:after:scale-x-100">
                      {i.label}
                    </span>
                  </Link>
                </li>
              ))}
              {/* Op de telefoon staat de knop rechtsboven niet in de kop, maar hier. */}
              <li className="mt-2 tablet:hidden">
                <Knop href={knop.href} klein aria-current={huidig(knop.href)}>
                  {knop.tekst}
                </Knop>
              </li>
            </ul>
          </nav>

          <div className="hidden justify-self-end tablet:block">
            <Knop href={knop.href} klein aria-current={huidig(knop.href)}>
              {knop.tekst}
            </Knop>
          </div>
        </div>
      </header>
    </>
  );
}
