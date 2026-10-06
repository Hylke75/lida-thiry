import Link from "next/link";
import { SocialIconen } from "@/components/SocialIconen";
import { linkBestaat } from "@/lib/website/links";
import { zonderDubbele } from "@/lib/website/weergave";
import { AlleenPubliek } from "./AlleenPubliek";
import { leesSiteNavigatie } from "./navigatie";
import { CONTAINER } from "./stijl";
import { Woordmerk } from "./Woordmerk";

/** Vaste links die altijd in de voettekst staan (ook zonder database). */
const VAST = [
  { href: "/blog", label: "Blog" },
  { href: "/cadeaubon", label: "Cadeaubon" },
  { href: "/mijn-advies", label: "Mijn advies" },
];

const META_LINK = "inline-flex min-h-11 items-center underline-offset-4 hover:text-ink hover:underline";

/**
 * Voettekst van de publieke site (docs/ontwerp: .site-footer): woordmerk, de
 * menulinks plus pagina's met "in footer", en een regel met ©, privacy,
 * voorwaarden, contact en een discrete beheerlink; plus de social-media-links
 * uit Beheer → Website → Instellingen. Niet in het beheer zelf.
 */
export async function SiteFooter() {
  const jaar = new Date().getFullYear();
  const [nav, contact] = await Promise.all([leesSiteNavigatie(), linkBestaat("/contact")]);
  const links = zonderDubbele(nav.menu, nav.footer, VAST);
  return (
    <AlleenPubliek>
      <footer className="mt-16 border-t border-line bg-white py-[42px]">
        <div
          className={`${CONTAINER} grid grid-cols-1 items-center justify-items-center gap-8 text-center desktop:grid-cols-[auto_1fr_auto] desktop:justify-items-stretch desktop:text-left`}
        >
          <Woordmerk naam={nav.site.korteNaam} subregel={nav.subregel} logo={nav.logo} />
          <nav aria-label="Voettekst">
            <ul className="flex flex-wrap justify-center gap-x-5 text-[13px] font-bold">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center underline-offset-4 hover:text-berry hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col items-center gap-1 text-[12px] text-ink-soft desktop:items-end">
            <SocialIconen links={nav.site.social} siteNaam={nav.site.korteNaam} />
            <p className="m-0 flex flex-wrap items-center justify-center gap-x-1.5">
              <span>
                © {jaar} {nav.site.volledigeNaam}
              </span>
              <span aria-hidden="true">·</span>
              <Link href="/privacy" className={META_LINK}>
                Privacy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/voorwaarden" className={META_LINK}>
                Voorwaarden
              </Link>
              {contact && (
                <>
                  <span aria-hidden="true">·</span>
                  <Link href="/contact" className={META_LINK}>
                    Contact
                  </Link>
                </>
              )}
              <span aria-hidden="true">·</span>
              <Link href="/admin/inloggen" className={META_LINK}>
                Beheer
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </AlleenPubliek>
  );
}
