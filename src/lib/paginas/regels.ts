// Pure regels voor beheerbare pagina's (zoals "Over mij", "Contact", "Werkwijze").
// Pagina's staan op /<slug>; vaste routes van de site mogen niet als slug.

export const GERESERVEERDE_SLUGS = new Set([
  "admin",
  "api",
  "auth",
  "bestellen",
  "blog",
  "nieuwsbrief",
  "privacy",
  "voorwaarden",
  "status",
  "test",
  "review",
  "robots.txt",
  "sitemap.xml",
  "icon.svg",
  "opengraph-image",
  "_next",
  "favicon.ico",
]);

export function geldigePaginaSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 && !GERESERVEERDE_SLUGS.has(slug);
}

/**
 * Blokken die in de tekst van een pagina op een eigen regel gezet kunnen worden.
 * {nieuwsbrief} = het standaard aanmeldblok; {nieuwsbrief_<slug>} = een specifiek
 * aanmeldformulier uit Beheer → Nieuwsbrief → Formulieren.
 */
export const PAGINA_BLOKKEN: Record<string, string> = {
  contactformulier: "het contactformulier",
  nieuwsbrief: "het standaard aanmeldblok voor de nieuwsbrief",
  test: "een knop en korte uitnodiging om de kledingadviestest te doen",
  laatste_blogs: "de drie nieuwste blogberichten",
  bedrijfsgegevens: "naam, adres, KvK en contactgegevens uit de instellingen",
};

/** Alle blokverwijzingen in een tekst, zoals "contactformulier" of "nieuwsbrief_zomer". */
export function blokkenInTekst(inhoud: string): string[] {
  const uit: string[] = [];
  for (const regel of inhoud.split(/\r?\n/)) {
    const m = /^\s*\{([a-z0-9_]+)\}\s*$/.exec(regel);
    if (m) uit.push(m[1]);
  }
  return uit;
}

/** Slug van een nieuwsbriefformulier uit een blok "nieuwsbrief_<slug>" (underscores → streepjes). */
export function formulierSlugUitBlok(blok: string): string | null {
  const m = /^nieuwsbrief_([a-z0-9_]+)$/.exec(blok);
  return m ? m[1].replace(/_/g, "-") : null;
}

/** Bloknaam voor een formulier-slug (streepjes → underscores, want blokken kennen geen streepjes). */
export function blokVoorFormulier(slug: string): string {
  return `nieuwsbrief_${slug.replace(/-/g, "_")}`;
}

/** Onbekende blokken in een tekst (voor een waarschuwing in de editor). */
export function onbekendeBlokken(inhoud: string, formulierSlugs: string[]): string[] {
  return blokkenInTekst(inhoud).filter((b) => {
    if (b in PAGINA_BLOKKEN) return false;
    const f = formulierSlugUitBlok(b);
    return !(f && formulierSlugs.includes(f));
  });
}
