import { Fragment } from "react";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { haalSilhouetten } from "@/lib/lichaamstypes";
import { STANDAARD_VORM } from "@/lib/lichaamstype-regels";
import { leesSectie } from "@/lib/inhoud/lees";
import {
  WEBSITE_ADVIES,
  WEBSITE_AFSLUITING,
  WEBSITE_BLOG,
  WEBSITE_ERVARINGEN,
  WEBSITE_FIGUURTYPES,
  WEBSITE_HERO,
  WEBSITE_OVER,
  WEBSITE_STAPPEN,
  WEBSITE_VRAGEN,
} from "@/lib/inhoud/groepen/website";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { haalLaatste } from "@/lib/blog/publiek";
import { haalGoedgekeurdeReviews } from "@/lib/reviews/publiek";
import { leesWebsite } from "@/lib/website/lees";
import { normaliseerIndeling } from "@/lib/website/homepage";
import { HOMEPAGE_WEERGAVE, type HomepageGegevens } from "@/components/homepage/Blokken";

export const dynamic = "force-dynamic";

function formatteerPrijs(cent: number, valuta: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(
    cent / 100,
  );
}

const TELWOORDEN = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];
const telwoord = (n: number) => TELWOORDEN[n] ?? String(n);

/**
 * De homepage. De blokken staan in components/homepage/Blokken.tsx; volgorde en
 * zichtbaarheid komen uit Beheer → Website → Homepage (standaard: alle blokken
 * in de vaste volgorde). De hero staat altijd bovenaan.
 */
export default async function Home() {
  const site = await leesWebsite();
  const indeling = normaliseerIndeling(site.homepageIndeling).filter((i) => i.zichtbaar);
  const toontBlog = indeling.some((i) => i.blok === "blog");
  const toontErvaringen = indeling.some((i) => i.blok === "ervaringen");

  const [silhouetten, hero, stappen, figuurtypes, advies, over, ervaringen, vragen, afsluiting, nieuwsbrief, blog, blogberichten, reviews] =
    await Promise.all([
      haalSilhouetten().catch(() => []),
      leesSectie(WEBSITE_HERO),
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
      toontErvaringen ? haalGoedgekeurdeReviews(6) : Promise.resolve([]),
    ]);
  let prijsLabel: string | null = null;
  try {
    const cent = await leesPrijsCent();
    const valuta = (await leesInstelling("valuta")) || "EUR";
    if (cent) prijsLabel = formatteerPrijs(cent, valuta);
  } catch {
    prijsLabel = null;
  }

  const gegevens: HomepageGegevens = {
    silhouetten,
    vorm: (i) => silhouetten[i]?.vorm ?? STANDAARD_VORM,
    aantal: { aantal: telwoord(silhouetten.length) },
    prijsLabel,
    ctaTekst: prijsLabel ? `${hero.knop} — ${prijsLabel}` : hero.knop,
    hero,
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

  return (
    <main className="flex w-full flex-1 flex-col">
      {indeling.map(({ blok }) => (
        <Fragment key={blok}>{HOMEPAGE_WEERGAVE[blok](gegevens)}</Fragment>
      ))}
    </main>
  );
}
