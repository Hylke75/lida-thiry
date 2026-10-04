// "Klaar voor livegang": de controlelijst op de beheer-homepage. Puur: krijgt
// gewone gegevens binnen (instellingen, teksten, types, omgevingsvariabelen) en
// geeft een lijst punten terug. Het ophalen gebeurt in productie-check.ts.

import { bevatPlaceholder, combineer, type Groep } from "./inhoud/schema";
import { CATEGORIEEN, ontleedTypeSleutel, typeSleutel } from "./lichaamstype-regels";
import { vapidCompleet } from "./push/regels";

export interface LivegangLink {
  href: string;
  label: string;
}

export interface LivegangItem {
  /** Vaste sleutel (voor React en tests). */
  id: string;
  label: string;
  ok: boolean;
  /**
   * "verplicht": moet in orde zijn voor de livegang.
   * "aanbevolen": kan ook later, maar is het nakijken waard.
   */
  niveau: "verplicht" | "aanbevolen";
  /** Korte toelichting: wat ontbreekt of wat er mis is. */
  detail?: string;
  /** Waar je het oplost. */
  links: LivegangLink[];
}

export interface LivegangOmgeving {
  GRATIS_TEST?: string;
  RESEND_VAN?: string;
  RESEND_API_KEY?: string;
  MOLLIE_API_KEY?: string;
  NEXT_PUBLIC_SITE_URL?: string;
  RESEND_WEBHOOK_SECRET?: string;
  NIEUWSBRIEF_GEHEIM?: string;
  ANTHROPIC_API_KEY?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export interface LivegangGegevens {
  prijsCent: number | null;
  instellingen: Readonly<Record<string, string | null | undefined>>;
  /** Groepen beheerbare teksten (uit inhoud/register.ts) en de opgeslagen aanpassingen. */
  tekstgroepen: readonly Groep[];
  opgeslagenTeksten: ReadonlyMap<string, unknown>;
  lichaamstypes: readonly { code: string; naam: string; actief: boolean; beeld_id: string | null }[];
  /** Alle adviestypes met hun aantal secties. */
  adviestypes: readonly { sleutel: string; secties: number }[];
  /** Uitkomsten van de berekening zonder lichaamstype (leeg = compleet). */
  ontbrekendeKoppelingen: readonly string[];
  omgeving: LivegangOmgeving;
  /** Aantal aangemelde nieuwsbriefcontacten (ontbreekt = 0). */
  aangemeldeContacten?: number;
  /** Of er een gepubliceerde pagina is met het blok {contactformulier} (ontbreekt = nee). */
  contactformulierGepubliceerd?: boolean;
  /** Aantal goedgekeurde reviews met toestemming (ontbreekt = punt niet tonen). */
  goedgekeurdeReviews?: number;
}

export const BEDRIJFSGEGEVENS: readonly { sleutel: string; label: string }[] = [
  { sleutel: "bedrijfsnaam", label: "bedrijfsnaam" },
  { sleutel: "bedrijf_adres", label: "adres" },
  { sleutel: "kvk_nummer", label: "KvK-nummer" },
  { sleutel: "contact_email", label: "contact-e-mailadres" },
];

const INSTELLINGEN: LivegangLink = { href: "/admin/instellingen", label: "Naar instellingen" };
const WEBSITE_INSTELLINGEN: LivegangLink = { href: "/admin/website", label: "Naar instellingen website" };
const VERCEL_UITLEG = "Wijzigen in Vercel → Settings → Environment Variables, daarna opnieuw publiceren.";
/** Aanbevolen minimum aantal goedgekeurde reviews voor de livegang. */
const MIN_REVIEWS = 3;
/** Hoeveel losse links we maximaal per punt tonen; de rest staat in de toelichting. */
const MAX_LINKS = 6;

function gevuld(w: string | null | undefined): boolean {
  return typeof w === "string" && w.trim() !== "";
}

/**
 * Of het website-adres een eigen domein is (geen *.vercel.app, geen localhost).
 * Leeg of ongeldig telt als "nee".
 */
export function isEigenDomein(url: string | null | undefined): boolean {
  if (typeof url !== "string" || !gevuld(url)) return false;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase().replace(/\.$/, "");
    if (host === "localhost" || /^[\d.]+$/.test(host) || !host.includes(".")) return false;
    return !(host === "vercel.app" || host.endsWith(".vercel.app"));
  } catch {
    return false;
  }
}

/** "a", "a en b", "a, b en c". */
export function opsomming(delen: readonly string[]): string {
  if (delen.length <= 1) return delen.join("");
  return `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
}

/** Het anker van een tekstsectie op de tekstenpagina (zoals in teksten/[groep]/page.tsx). */
export function sectieAnker(sleutel: string): string {
  return sleutel.replace(/\./g, "-");
}

/** Secties waarvan de (opgeslagen of standaard)tekst nog een invulplek bevat. */
export function tekstenMetPlaceholder(
  groepen: readonly Groep[],
  opgeslagen: ReadonlyMap<string, unknown>,
): { groep: Groep; sleutel: string; titel: string; href: string }[] {
  const uit: { groep: Groep; sleutel: string; titel: string; href: string }[] = [];
  for (const groep of groepen) {
    for (const s of groep.secties) {
      if (bevatPlaceholder(combineer(s, opgeslagen.get(s.sleutel)))) {
        uit.push({
          groep,
          sleutel: s.sleutel,
          titel: s.titel,
          href: `/admin/teksten/${groep.sleutel}#${sectieAnker(s.sleutel)}`,
        });
      }
    }
  }
  return uit;
}

function beperk(links: LivegangLink[], meer: LivegangLink): LivegangLink[] {
  return links.length > MAX_LINKS ? [...links.slice(0, MAX_LINKS - 1), meer] : links;
}

/** Evalueert alle punten van de controlelijst. */
export function evalueerLivegang(g: LivegangGegevens): LivegangItem[] {
  const items: LivegangItem[] = [];
  const env = g.omgeving;

  // Instellingen -------------------------------------------------------------
  items.push({
    id: "prijs",
    label: "Prijs van de test ingesteld",
    ok: g.prijsCent != null,
    niveau: "verplicht",
    detail: g.prijsCent != null ? undefined : "Zonder prijs kan niemand de test kopen.",
    links: [INSTELLINGEN],
  });

  const ontbrekend = BEDRIJFSGEGEVENS.filter((b) => !gevuld(g.instellingen[b.sleutel])).map((b) => b.label);
  items.push({
    id: "bedrijfsgegevens",
    label: "Bedrijfsgegevens ingevuld",
    ok: ontbrekend.length === 0,
    niveau: "verplicht",
    detail: ontbrekend.length ? `Nog in te vullen: ${opsomming(ontbrekend)}.` : undefined,
    links: [INSTELLINGEN],
  });

  items.push({
    id: "foutmeldingen",
    label: "E-mailadres voor foutmeldingen ingesteld",
    ok: gevuld(g.instellingen.adviseur_email),
    niveau: "verplicht",
    detail: gevuld(g.instellingen.adviseur_email)
      ? undefined
      : "Zonder dit adres hoor je het niet als een advies of e-mail niet verstuurd kon worden.",
    links: [INSTELLINGEN],
  });

  // Teksten ------------------------------------------------------------------
  const placeholders = tekstenMetPlaceholder(g.tekstgroepen, g.opgeslagenTeksten);
  items.push({
    id: "teksten",
    label: "Alle teksten ingevuld (geen “[aan te vullen …]” meer)",
    ok: placeholders.length === 0,
    niveau: "verplicht",
    detail: placeholders.length
      ? `${placeholders.length} ${placeholders.length === 1 ? "onderdeel bevat" : "onderdelen bevatten"} nog een invulplek.`
      : undefined,
    links: beperk(
      placeholders.map((p) => ({ href: p.href, label: `${p.groep.titel}: ${p.titel}` })),
      { href: "/admin/teksten", label: "Alle teksten" },
    ),
  });

  // Lichaamstypes en adviestypes ---------------------------------------------
  items.push({
    id: "koppeling",
    label: "Elke uitkomst van de berekening hoort bij een lichaamstype",
    ok: g.ontbrekendeKoppelingen.length === 0,
    niveau: "verplicht",
    detail: g.ontbrekendeKoppelingen.length ? `Nog niet gekoppeld: ${opsomming(g.ontbrekendeKoppelingen)}.` : undefined,
    links: [{ href: "/admin/lichaamstypes#koppeling", label: "Naar de koppeling" }],
  });

  const actief = g.lichaamstypes.filter((t) => t.actief);
  const bestaand = new Set(g.adviestypes.map((t) => t.sleutel));
  const missendPerType = actief
    .map((t) => ({ t, missend: CATEGORIEEN.map((c) => typeSleutel(c, t.code)).filter((s) => !bestaand.has(s)) }))
    .filter((m) => m.missend.length > 0);
  const aantalMissend = missendPerType.reduce((n, m) => n + m.missend.length, 0);
  items.push({
    id: "adviestypes",
    label: "Voor elk actief lichaamstype alle 12 adviestypes aanwezig",
    ok: aantalMissend === 0,
    niveau: "verplicht",
    detail: aantalMissend
      ? `Ontbreekt: ${missendPerType.map((m) => `${m.t.naam} (${m.missend.join(", ")})`).join("; ")}.`
      : undefined,
    links: beperk(
      missendPerType.map((m) => ({ href: `/admin/types?letter=${encodeURIComponent(m.t.code)}`, label: m.t.naam })),
      { href: "/admin/types", label: "Alle adviestypes" },
    ),
  });

  const actieveCodes = new Set(actief.map((t) => t.code));
  const zonderSecties = g.adviestypes
    .filter((t) => t.secties === 0 && actieveCodes.has(ontleedTypeSleutel(t.sleutel)?.code ?? ""))
    .map((t) => t.sleutel);
  items.push({
    id: "adviestekst",
    label: "Elk adviestype heeft inhoud",
    ok: zonderSecties.length === 0,
    niveau: "verplicht",
    detail: zonderSecties.length ? `Zonder onderdelen (lege hand-out): ${zonderSecties.join(", ")}.` : undefined,
    links: beperk(
      zonderSecties.map((s) => ({ href: `/admin/types/${encodeURIComponent(s)}`, label: s })),
      { href: "/admin/types?aandacht=1", label: "Alle types met aandachtspunten" },
    ),
  });

  const zonderFoto = actief.filter((t) => !t.beeld_id);
  items.push({
    id: "silhouetfoto",
    label: "Elk actief lichaamstype heeft een afbeelding",
    ok: zonderFoto.length === 0,
    niveau: "aanbevolen",
    detail: zonderFoto.length
      ? `Zonder afbeelding (de getekende vorm wordt getoond): ${opsomming(zonderFoto.map((t) => t.naam))}.`
      : undefined,
    links: beperk(
      zonderFoto.map((t) => ({ href: `/admin/lichaamstypes/${encodeURIComponent(t.code)}`, label: t.naam })),
      { href: "/admin/lichaamstypes", label: "Alle lichaamstypes" },
    ),
  });

  // Omgeving (Vercel) --------------------------------------------------------
  items.push({
    id: "gratis-test",
    label: "Gratis testmodus staat uit",
    ok: !gevuld(env.GRATIS_TEST),
    niveau: "verplicht",
    detail: gevuld(env.GRATIS_TEST)
      ? `GRATIS_TEST staat aan: iedereen kan de test zonder betalen doen. ${VERCEL_UITLEG}`
      : undefined,
    links: [],
  });

  const mollie = (env.MOLLIE_API_KEY ?? "").trim();
  items.push({
    id: "mollie",
    label: "Echte Mollie-sleutel (live) ingesteld",
    ok: mollie.startsWith("live_"),
    niveau: "verplicht",
    detail: !mollie
      ? `MOLLIE_API_KEY ontbreekt: betalen is niet mogelijk. ${VERCEL_UITLEG}`
      : mollie.startsWith("test_")
        ? `MOLLIE_API_KEY is een testsleutel: er wordt niet echt betaald. ${VERCEL_UITLEG}`
        : mollie.startsWith("live_")
          ? undefined
          : `MOLLIE_API_KEY lijkt geen geldige sleutel (begint niet met live_). ${VERCEL_UITLEG}`,
    links: [],
  });

  items.push({
    id: "resend-sleutel",
    label: "E-mail versturen ingesteld (RESEND_API_KEY)",
    ok: gevuld(env.RESEND_API_KEY),
    niveau: "verplicht",
    detail: gevuld(env.RESEND_API_KEY) ? undefined : `Zonder deze sleutel worden er geen e-mails verstuurd. ${VERCEL_UITLEG}`,
    links: [],
  });

  items.push({
    id: "resend-van",
    label: "Eigen afzenderadres voor e-mails (RESEND_VAN)",
    ok: gevuld(env.RESEND_VAN),
    niveau: "verplicht",
    detail: gevuld(env.RESEND_VAN)
      ? undefined
      : `E-mails gaan nu van het testadres onboarding@resend.dev en komen alleen bij het Resend-account zelf aan. ${VERCEL_UITLEG}`,
    links: [],
  });

  items.push({
    id: "site-url",
    label: "Website-adres ingesteld (NEXT_PUBLIC_SITE_URL)",
    ok: gevuld(env.NEXT_PUBLIC_SITE_URL),
    niveau: "verplicht",
    detail: gevuld(env.NEXT_PUBLIC_SITE_URL)
      ? undefined
      : `Nodig voor de links in e-mails en voor de terugkeer na betalen. ${VERCEL_UITLEG}`,
    links: [],
  });

  const siteAdres = (env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  const eigenDomein = isEigenDomein(siteAdres);
  items.push({
    id: "eigen-domein",
    label: "Website draait op een eigen domein",
    ok: eigenDomein,
    niveau: "aanbevolen",
    detail: eigenDomein
      ? undefined
      : siteAdres
        ? `NEXT_PUBLIC_SITE_URL is nu ${siteAdres}. Koppel je eigen domein (bijv. lidathiry.nl) in Vercel → Settings → Domains en zet het adres in NEXT_PUBLIC_SITE_URL. Links in e-mails, zoekresultaten en gedeelde berichten tonen dan je eigen naam. ${VERCEL_UITLEG}`
        : `Stel eerst NEXT_PUBLIC_SITE_URL in op je eigen domein (bijv. https://lidathiry.nl). ${VERCEL_UITLEG}`,
    links: [],
  });

  // Nieuwsbrief --------------------------------------------------------------
  const aangemeld = g.aangemeldeContacten ?? 0;
  const afzender = (env.RESEND_VAN ?? "").trim() || "onboarding@resend.dev";
  const testAfzender = /@resend\.dev\b/i.test(afzender);
  items.push({
    id: "nieuwsbrief-afzender",
    label: "Nieuwsbrief gaat van een eigen afzenderadres",
    ok: !(testAfzender && aangemeld > 0),
    niveau: "verplicht",
    detail:
      testAfzender && aangemeld > 0
        ? `Er ${aangemeld === 1 ? "is 1 aangemeld contact" : `zijn ${aangemeld} aangemelde contacten`}, maar de afzender is het testadres van resend.dev: nieuwsbrieven komen dan niet aan. Zet RESEND_VAN op een adres van je eigen (in Resend geverifieerde) domein. ${VERCEL_UITLEG}`
        : undefined,
    links: [{ href: "/admin/nieuwsbrief", label: "Naar de nieuwsbrief" }],
  });

  items.push({
    id: "nieuwsbrief-webhook",
    label: "Bounces en klachten automatisch verwerken (RESEND_WEBHOOK_SECRET)",
    ok: gevuld(env.RESEND_WEBHOOK_SECRET),
    niveau: "aanbevolen",
    detail: gevuld(env.RESEND_WEBHOOK_SECRET)
      ? undefined
      : "Zonder deze koppeling blijven onbestaande adressen (bounces) en mensen die je mail als spam markeren (klachten) op je lijst staan. Dat schaadt de bezorging van al je mails. " +
        "Maak in Resend → Webhooks een webhook naar /api/nb/webhook (gebeurtenissen email.bounced en email.complained) en zet het geheim (whsec_…) in RESEND_WEBHOOK_SECRET. " +
        VERCEL_UITLEG,
    links: [],
  });

  items.push({
    id: "nieuwsbrief-geheim",
    label: "Eigen geheim voor nieuwsbrieflinks (NIEUWSBRIEF_GEHEIM)",
    ok: gevuld(env.NIEUWSBRIEF_GEHEIM),
    niveau: "aanbevolen",
    detail: gevuld(env.NIEUWSBRIEF_GEHEIM)
      ? undefined
      : "Kliklinks in nieuwsbrieven worden nu ondertekend met een ander geheim (CRON_SECRET of de Supabase-sleutel). Werkt, maar wisselt dat geheim ooit, dan werken oude kliklinks niet meer. Zet een eigen lange willekeurige waarde. " +
        VERCEL_UITLEG,
    links: [],
  });

  // Contact ----------------------------------------------------------------------
  const contactformulier = g.contactformulierGepubliceerd === true;
  items.push({
    id: "contactformulier",
    label: "Contactformulier staat op een gepubliceerde pagina",
    ok: contactformulier,
    niveau: "aanbevolen",
    detail: contactformulier
      ? undefined
      : "Bezoekers kunnen je nu niet via de website een bericht sturen. Maak een pagina (bijv. ‘Contact’), zet {contactformulier} op een eigen regel in de tekst en publiceer de pagina.",
    links: [{ href: "/admin/paginas", label: "Naar de pagina's" }],
  });

  const contactAdres = gevuld(g.instellingen.adviseur_email) || gevuld(g.instellingen.contact_email);
  items.push({
    id: "contact-meldingen",
    label: "E-mailadres voor nieuwe contactberichten ingesteld",
    ok: contactAdres,
    // Pas een blokkade als het formulier echt online staat.
    niveau: contactformulier ? "verplicht" : "aanbevolen",
    detail: contactAdres
      ? undefined
      : "Meldingen van nieuwe berichten gaan naar het e-mailadres voor foutmeldingen, anders naar het contact-e-mailadres. Zonder een van beide zie je nieuwe berichten alleen in Beheer → Berichten.",
    links: [INSTELLINGEN, { href: "/admin/berichten", label: "Naar de berichten" }],
  });

  // Website ----------------------------------------------------------------------
  const logo = gevuld(g.instellingen.logo_url);
  items.push({
    id: "logo",
    label: "Logo ingesteld",
    ok: logo,
    niveau: "aanbevolen",
    detail: logo ? undefined : "Bovenaan de site staat nu de naam als tekst. Met een logo herkennen bezoekers je huisstijl direct.",
    links: [WEBSITE_INSTELLINGEN],
  });

  const deelafbeelding = gevuld(g.instellingen.deel_afbeelding_url);
  items.push({
    id: "deelafbeelding",
    label: "Deelafbeelding ingesteld",
    ok: deelafbeelding,
    niveau: "aanbevolen",
    detail: deelafbeelding
      ? undefined
      : "Wie een link naar je site deelt (WhatsApp, Facebook, LinkedIn), ziet nu de standaardafbeelding in de huisstijl. Een eigen foto van 1200×630 pixels maakt het persoonlijker.",
    links: [WEBSITE_INSTELLINGEN],
  });

  // Blog -------------------------------------------------------------------------
  items.push({
    id: "ai-schrijfhulp",
    label: "AI-schrijfhulp ingesteld (ANTHROPIC_API_KEY)",
    ok: gevuld(env.ANTHROPIC_API_KEY),
    niveau: "aanbevolen",
    detail: gevuld(env.ANTHROPIC_API_KEY)
      ? undefined
      : "Zonder deze sleutel werkt de AI-schrijfhulp in het blogbeheer niet; zelf berichten schrijven en publiceren kan wel. " +
        "Maak een API-sleutel aan op console.anthropic.com en zet die in ANTHROPIC_API_KEY. " +
        VERCEL_UITLEG,
    links: [{ href: "/admin/blog", label: "Naar de blog" }],
  });

  // Reviews ----------------------------------------------------------------------
  if (g.goedgekeurdeReviews !== undefined) {
    const reviews = g.goedgekeurdeReviews;
    items.push({
      id: "reviews",
      label: "Minstens 3 goedgekeurde reviews op de website",
      ok: reviews >= MIN_REVIEWS,
      niveau: "aanbevolen",
      detail:
        reviews >= MIN_REVIEWS
          ? undefined
          : `Nu ${reviews === 1 ? "1 review" : `${reviews} reviews`}. Echte ervaringen van klanten geven nieuwe bezoekers vertrouwen. Klanten krijgen na hun advies automatisch een uitnodiging; je kunt eerdere klanten ook zelf uitnodigen.`,
      links: [{ href: "/admin/reviews", label: "Naar de reviews" }],
    });
  }

  // Pushmeldingen ----------------------------------------------------------------
  const push = vapidCompleet(env);
  items.push({
    id: "pushmeldingen",
    label: "Pushmeldingen ingesteld (VAPID-sleutels)",
    ok: push,
    niveau: "aanbevolen",
    detail: push
      ? undefined
      : "Met pushmeldingen krijg je op je telefoon direct bericht bij een betaalde bestelling of een nieuw contactbericht. " +
        "Maak een sleutelpaar met `node scripts/vapid-sleutels.mjs mailto:jij@jouwdomein.nl` en zet VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY en VAPID_SUBJECT. " +
        VERCEL_UITLEG,
    links: [{ href: "/admin/meldingen", label: "Naar de meldingen" }],
  });

  return items;
}

/** Samenvatting: klaar als alle verplichte punten in orde zijn. */
export function livegangStatus(items: readonly LivegangItem[]): {
  klaar: boolean;
  allesKlaar: boolean;
  openVerplicht: number;
  openAanbevolen: number;
} {
  const openVerplicht = items.filter((i) => !i.ok && i.niveau === "verplicht").length;
  const openAanbevolen = items.filter((i) => !i.ok && i.niveau === "aanbevolen").length;
  return { klaar: openVerplicht === 0, allesKlaar: openVerplicht + openAanbevolen === 0, openVerplicht, openAanbevolen };
}
