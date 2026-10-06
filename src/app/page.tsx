import { haalGoedgekeurdeReviews, haalReviewSamenvatting } from "@/lib/reviews/publiek";
import { Fragment } from "react";
import { leesPubliekeInstellingen, leesPubliekePrijs } from "@/lib/instellingen";
import { haalSilhouettenPubliek } from "@/lib/lichaamstypes";
import { STANDAARD_VORM } from "@/lib/lichaamstype-regels";
import { leesSectie } from "@/lib/inhoud/lees";
import {
  WEBSITE_ADVIES,
  WEBSITE_AFSLUITING,
  WEBSITE_BLOG,
  WEBSITE_DIENSTEN,
  WEBSITE_ERVARINGEN,
  WEBSITE_FIGUURTYPES,
  WEBSITE_HERO,
  WEBSITE_OVER,
  WEBSITE_PROBLEEM,
  WEBSITE_STAPPEN,
  WEBSITE_VRAGEN,
} from "@/lib/inhoud/groepen/website";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { haalLaatste } from "@/lib/blog/publiek";
import { leesWebsite } from "@/lib/website/lees";
import { normaliseerIndeling } from "@/lib/website/homepage";
import { siteUrl } from "@/lib/site";
import { faqJsonLd, organisatieJsonLd, testProductJsonLd, veiligeJson, type ReviewSamenvatting } from "@/lib/seo/structuur";
import { HOMEPAGE_WEERGAVE, MAX_ERVARINGEN, type HomepageGegevens } from "@/components/homepage/Blokken";
import { formatteerBedrag } from "@/lib/prijs";
import { haalActieveSoortenPubliek } from "@/lib/afspraken/data";
import { eersteBestaandeLink } from "@/lib/website/links";
import { veiligeLink } from "@/lib/website/weergave";

// Statisch met ISR. Alles op de homepage komt uit de database en is voor elke
// bezoeker gelijk: teksten, instellingen, silhouetten, reviews en de nieuwste
// blogberichten. Die staan in de datacache met tags (lib/cache/tags.ts); opslaan
// in het beheer vernieuwt de tags en daarmee deze pagina direct. Zonder wijziging
// wordt de pagina elk uur opnieuw opgebouwd; staat het blogblok aan, dan hooguit
// elke 2 minuten (Next neemt de kortste levensduur van de gegevens over), zodat
// ingeplande berichten op tijd verschijnen. Geen cookies of zoekparameters
// nodig, dus geen force-dynamic meer.
export const revalidate = 3600;

const TELWOORDEN = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];
// Zonder figuurtypes (bijv. database onbereikbaar) liever "De verschillende figuurtypes" dan "De nul".
const telwoord = (n: number) => (n === 0 ? "verschillende" : (TELWOORDEN[n] ?? String(n)));

/**
 * De homepage. De blokken staan in components/homepage/Blokken.tsx; volgorde en
 * zichtbaarheid komen uit Beheer → Website → Homepage (standaard: de volgorde
 * van het ontwerp in docs/ontwerp). De hero staat altijd bovenaan.
 */
export default async function Home() {
  const site = await leesWebsite();
  const indeling = normaliseerIndeling(site.homepageIndeling).filter((i) => i.zichtbaar);
  const toontBlog = indeling.some((i) => i.blok === "blog");
  const toontErvaringen = indeling.some((i) => i.blok === "ervaringen");
  const toontDiensten = indeling.some((i) => i.blok === "diensten");

  const [silhouetten, hero, diensten, probleem, stappen, figuurtypes, advies, over, ervaringen, vragen, afsluiting, nieuwsbrief, blog, blogberichten, reviews, afspraakSoorten] =
    await Promise.all([
      haalSilhouettenPubliek().catch(() => []),
      leesSectie(WEBSITE_HERO),
      leesSectie(WEBSITE_DIENSTEN),
      leesSectie(WEBSITE_PROBLEEM),
      leesSectie(WEBSITE_STAPPEN),
      leesSectie(WEBSITE_FIGUURTYPES),
      leesSectie(WEBSITE_ADVIES),
      leesSectie(WEBSITE_OVER),
      leesSectie(WEBSITE_ERVARINGEN),
      leesSectie(WEBSITE_VRAGEN),
      leesSectie(WEBSITE_AFSLUITING),
      leesSectie(NIEUWSBRIEF_AANMELDEN),
      leesSectie(WEBSITE_BLOG),
      toontBlog ? haalLaatste(3) : Promise.resolve([]),
      toontErvaringen ? haalGoedgekeurdeReviews(MAX_ERVARINGEN) : Promise.resolve([]),
      toontDiensten ? haalActieveSoortenPubliek().catch(() => []) : Promise.resolve([]),
    ]);
  let prijsLabel: string | null = null;
  let prijsCent: number | null = null;
  let valuta = "EUR";
  try {
    const prijs = await leesPubliekePrijs();
    valuta = prijs.valuta;
    prijsCent = prijs.prijsCent;
    if (prijsCent) prijsLabel = formatteerBedrag(prijsCent, valuta);
  } catch {
    prijsLabel = null;
  }

  // "vanaf €…" voor de kaart Persoonlijk advies: de laagste prijs van de afspraaksoorten.
  const afspraakPrijzen = afspraakSoorten.map((s) => s.prijs_cent).filter((c) => c > 0);
  const afspraakVanaf = afspraakPrijzen.length ? `vanaf ${formatteerBedrag(Math.min(...afspraakPrijzen), valuta)}` : "";
  // De knop bij Over Lida: de ingestelde pagina als die bestaat, anders contact.
  const overLink = await eersteBestaandeLink(veiligeLink(over.knopLink, "/over-mij"), "/contact", "/afspraak");

  const gegevens: HomepageGegevens = {
    silhouetten,
    vorm: (i) => silhouetten[i]?.vorm ?? STANDAARD_VORM,
    aantal: { aantal: telwoord(silhouetten.length) },
    prijzen: { prijs: prijsLabel ?? "", afspraak_vanaf: afspraakVanaf },
    ctaTekst: prijsLabel ? `${afsluiting.knop} — ${prijsLabel}` : afsluiting.knop,
    overLink,
    hero,
    diensten,
    probleem,
    stappen,
    figuurtypes,
    advies,
    over,
    ervaringen,
    reviews,
    vragen,
    afsluiting,
    nieuwsbrief,
    blog,
    blogberichten,
  };

  const jsonLd = await structuur({
    site,
    prijsCent,
    valuta,
    vragen: indeling.some((i) => i.blok === "vragen") ? vragen.vragen : [],
  });

  return (
    // -mb-16: de voettekst heeft een marge voor gewone pagina's; de homepage eindigt met eigen ruimte.
    <main className="-mb-16 flex w-full flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: veiligeJson(jsonLd) }} />
      {indeling.map(({ blok }) => (
        <Fragment key={blok}>{HOMEPAGE_WEERGAVE[blok](gegevens)}</Fragment>
      ))}
    </main>
  );
}

/** Een ingevulde instelling zonder invulplek als "[adres]"; anders null. */
function echt(w: string | null | undefined): string | null {
  const t = w?.trim();
  return t && !t.includes("[") ? t : null;
}

/**
 * Gestructureerde gegevens voor zoekmachines: de organisatie, de test als
 * product met prijs, en de veelgestelde vragen (alleen als dat blok zichtbaar is).
 */
async function structuur(o: {
  site: Awaited<ReturnType<typeof leesWebsite>>;
  prijsCent: number | null;
  valuta: string;
  vragen: readonly { vraag: string; antwoord: string }[];
}): Promise<Record<string, unknown>[]> {
  const basis = siteUrl();
  let inst: Record<string, string | null> = {};
  try {
    inst = await leesPubliekeInstellingen();
  } catch {
    inst = {};
  }
  // Gemiddelde score uit goedgekeurde reviews (met toestemming); zonder reviews geen score.
  const samenvatting = await haalReviewSamenvatting().catch(() => null);
  const beoordeling: ReviewSamenvatting | null = samenvatting && samenvatting.aantal > 0 ? samenvatting : null;
  const uit: Record<string, unknown>[] = [
    organisatieJsonLd({
      naam: echt(inst.bedrijfsnaam) ?? o.site.volledigeNaam,
      url: basis,
      omschrijving: o.site.omschrijving,
      logo: o.site.logoUrl,
      email: echt(inst.contact_email),
      adres: echt(inst.bedrijf_adres),
      sameAs: o.site.social.map((s) => s.url),
    }),
    testProductJsonLd({
      naam: "Online kledingadviestest",
      omschrijving: o.site.omschrijving,
      url: basis,
      prijsCent: o.prijsCent,
      valuta: o.valuta,
      afbeelding: o.site.deelAfbeeldingUrl ?? o.site.logoUrl,
      beoordeling,
    }),
  ];
  const faq = faqJsonLd(o.vragen);
  if (faq) uit.push(faq);
  return uit;
}
