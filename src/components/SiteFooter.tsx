import Link from "next/link";
import { haalMenu } from "@/lib/paginas/publiek";
import { leesWebsite } from "@/lib/website/lees";
import { SocialIconen } from "./SocialIconen";

/**
 * Gedeelde footer: copyright, pagina's met "in footer", juridische links en een
 * discrete beheerlink, plus de social-media-links uit Beheer → Website → Instellingen.
 * Is de database niet bereikbaar, dan blijven de vaste links staan.
 */
export async function SiteFooter() {
  const jaar = new Date().getFullYear();
  const [{ footer }, site] = await Promise.all([haalMenu(), leesWebsite()]);
  return (
    <footer className="mt-16 border-t border-foreground/10 px-6 py-8 text-sm text-foreground/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <p>
            © {jaar} {site.volledigeNaam}
          </p>
          <SocialIconen links={site.social} siteNaam={site.korteNaam} />
        </div>
        <nav aria-label="Voettekst" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {footer.map((p) => (
            <Link key={p.href} href={p.href} className="hover:text-accent">
              {p.label}
            </Link>
          ))}
          <Link href="/blog" className="hover:text-accent">
            Blog
          </Link>
          <Link href="/cadeaubon" className="hover:text-accent">
            Cadeaubon
          </Link>
          <Link href="/mijn-advies" className="hover:text-accent">
            Mijn advies
          </Link>
          <Link href="/voorwaarden" className="hover:text-accent">
            Algemene voorwaarden
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            Privacyverklaring
          </Link>
          <Link href="/admin/inloggen" className="hover:text-accent">
            Beheer
          </Link>
        </nav>
      </div>
    </footer>
  );
}
