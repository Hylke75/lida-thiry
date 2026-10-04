import Link from "next/link";

/** Gedeelde footer: copyright, juridische links en een discrete beheerlink. */
export function SiteFooter() {
  const jaar = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-foreground/10 px-6 py-8 text-sm text-foreground/60">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <p>© {jaar} Lida Thiry Imago &amp; Kledingadvies</p>
        <nav aria-label="Voettekst" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <Link href="/blog" className="hover:text-accent">
            Blog
          </Link>
          <Link href="/voorwaarden" className="hover:text-accent">
            Algemene voorwaarden
          </Link>
          <Link href="/privacy" className="hover:text-accent">
            Privacyverklaring
          </Link>
          <Link href="/admin/inloggen" className="text-foreground/40 hover:text-accent">
            Beheer
          </Link>
        </nav>
      </div>
    </footer>
  );
}
