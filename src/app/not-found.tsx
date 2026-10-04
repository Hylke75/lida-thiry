import type { Metadata } from "next";
import Link from "next/link";
import { leesSectie } from "@/lib/inhoud/lees";
import { WEBSITE_FOUT } from "@/lib/inhoud/groepen/website";
import { haalLaatste } from "@/lib/blog/publiek";
import { haalPagina } from "@/lib/paginas/publiek";
import { BlogKaart } from "@/components/blog/BlogKaart";

export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false },
};

/**
 * 404-pagina (ook voor notFound() in [pagina] en blog/[slug]). Teksten uit
 * Beheer → Teksten → Website → Foutpagina's. Alles faalt zacht: zonder database
 * staan er de standaardteksten en de vaste links.
 */
export default async function NietGevonden() {
  const [t, contact, berichten] = await Promise.all([
    leesSectie(WEBSITE_FOUT),
    haalPagina("contact").catch(() => null),
    haalLaatste(3).catch(() => []),
  ]);

  const suggesties = [
    { href: "/", label: t.homeKnop, uitleg: "Lees wat de kledingadviestest je oplevert." },
    { href: "/bestellen", label: "Doe de test", uitleg: "Ontdek je figuurtype en ontvang je persoonlijke advies." },
    { href: "/blog", label: "Blog", uitleg: "Tips en inspiratie over kleding en figuur." },
    ...(contact ? [{ href: "/contact", label: contact.menu_label || contact.titel, uitleg: "Stel je vraag rechtstreeks aan Lida." }] : []),
  ];

  return (
    <main className="flex w-full flex-1 flex-col">
      <section className="bg-accent-zacht/60">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center sm:py-24">
          <span className="rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent">
            404
          </span>
          <h1 className="text-balance text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{t.nietGevondenTitel}</h1>
          <p className="max-w-xl text-balance text-lg text-foreground/70">{t.nietGevondenTekst}</p>
          <Link
            href="/"
            className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.homeKnop}
          </Link>
        </div>
      </section>

      <section aria-labelledby="suggesties" className="mx-auto w-full max-w-5xl px-6 py-14">
        <h2 id="suggesties" className="text-center text-2xl font-semibold tracking-tight">
          {t.suggestiesTitel}
        </h2>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suggesties.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                className="flex h-full flex-col gap-1.5 rounded-2xl bg-kaart p-5 shadow-sm ring-1 ring-foreground/5 transition-colors hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <span className="font-semibold text-accent">{s.label} →</span>
                <span className="text-sm text-foreground/65">{s.uitleg}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {berichten.length > 0 && (
        <section aria-labelledby="nieuw-op-blog" className="bg-kaart">
          <div className="mx-auto w-full max-w-5xl px-6 py-14">
            <h2 id="nieuw-op-blog" className="text-center text-2xl font-semibold tracking-tight">
              {t.blogTitel}
            </h2>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {berichten.map((b) => (
                <li key={b.id}>
                  <BlogKaart bericht={b} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </main>
  );
}
