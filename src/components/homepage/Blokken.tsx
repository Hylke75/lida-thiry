import Link from "next/link";
import type { ReactNode } from "react";
import { Lichaam } from "@/app/test/[token]/Lichaam";
import { Opmaak } from "@/components/Opmaak";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { BlogKaart } from "@/components/blog/BlogKaart";
import { vulIn, type SectieWaarden } from "@/lib/inhoud/schema";
import type {
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
import type { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import type { BlogBericht } from "@/lib/blog/regels";
import type { PubliekeReview } from "@/lib/reviews/regels";
import type { HomepageBlok } from "@/lib/website/homepage";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { Lichaamsvorm } from "@/lib/test-config";

// De blokken van de homepage, elk als losse component. De pagina (app/page.tsx)
// haalt alle gegevens één keer op en toont de blokken in de volgorde uit
// Beheer → Website → Homepage (lib/website/homepage.ts).

export interface HomepageGegevens {
  silhouetten: readonly Silhouet[];
  /** Vorm van het i-de silhouet (of de standaardvorm). */
  vorm: (i: number) => Lichaamsvorm;
  /** Het aantal figuurtypes in letters, voor {aantal}. */
  aantal: { aantal: string };
  prijsLabel: string | null;
  ctaTekst: string;
  hero: SectieWaarden<typeof WEBSITE_HERO>;
  stappen: SectieWaarden<typeof WEBSITE_STAPPEN>;
  figuurtypes: SectieWaarden<typeof WEBSITE_FIGUURTYPES>;
  advies: SectieWaarden<typeof WEBSITE_ADVIES>;
  over: SectieWaarden<typeof WEBSITE_OVER>;
  ervaringen: SectieWaarden<typeof WEBSITE_ERVARINGEN>;
  /** Goedgekeurde reviews met toestemming (nieuwste eerst); staan vóór de handmatige ervaringen. */
  reviews: readonly PubliekeReview[];
  vragen: SectieWaarden<typeof WEBSITE_VRAGEN>;
  afsluiting: SectieWaarden<typeof WEBSITE_AFSLUITING>;
  nieuwsbrief: SectieWaarden<typeof NIEUWSBRIEF_AANMELDEN>;
  blog: SectieWaarden<typeof WEBSITE_BLOG>;
  blogberichten: readonly BlogBericht[];
}

type Blok = (g: HomepageGegevens) => ReactNode;

const CTA =
  "rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90";

const Hero: Blok = ({ hero, ctaTekst, prijsLabel, vorm }) => (
  <section className="bg-accent-zacht/60">
    <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-6 text-center md:text-left">
        <span className="mx-auto w-fit rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent md:mx-0">
          {hero.bovenschrift}
        </span>
        <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{hero.titel}</h1>
        <p className="text-balance text-lg text-foreground/70">{hero.intro}</p>
        <div className="flex flex-col items-center gap-3 md:items-start">
          <Link href="/bestellen" className={CTA}>
            {ctaTekst}
          </Link>
          {prijsLabel ? (
            <p className="text-xs text-foreground/70">{hero.prijsregel}</p>
          ) : (
            <p className="text-xs text-foreground/70">{hero.geenPrijs}</p>
          )}
        </div>
      </div>
      <div className="mx-auto flex items-end gap-2" aria-hidden="true">
        <Lichaam vorm={vorm(1)} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
        <Lichaam vorm={vorm(0)} armen={false} titel="" className="h-64 w-auto sm:h-80" />
        <Lichaam vorm={vorm(2)} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
      </div>
    </div>
  </section>
);

const Stappen: Blok = ({ stappen }) => (
  <section className="mx-auto w-full max-w-5xl px-6 py-16">
    <h2 className="text-center text-3xl font-semibold tracking-tight">{stappen.titel}</h2>
    <ol className="mt-10 grid gap-6 md:grid-cols-3">
      {stappen.stappen.map((s, i) => (
        <li key={s._id} className="flex flex-col gap-3 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-zacht font-semibold text-accent">
            {i + 1}
          </span>
          <h3 className="text-lg font-semibold">{s.titel}</h3>
          <p className="text-sm text-foreground/70">{s.tekst}</p>
        </li>
      ))}
    </ol>
  </section>
);

const Figuurtypes: Blok = ({ figuurtypes, aantal, silhouetten }) => (
  <section className="bg-kaart">
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{vulIn(figuurtypes.titel, aantal)}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-center text-foreground/70">{vulIn(figuurtypes.intro, aantal)}</p>
      <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {silhouetten.map((s) => (
          <li key={s.letter} className="flex flex-col items-center gap-2 text-center">
            <div className="flex w-full justify-center rounded-2xl bg-accent-zacht/50 py-4">
              <Lichaam vorm={s.vorm} armen={false} titel={`Silhouet ${s.naam}`} className="h-40 w-auto" />
            </div>
            <h3 className="mt-1 font-semibold">{s.naam}</h3>
            <p className="text-sm text-foreground/70">{s.omschrijving}</p>
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const Advies: Blok = ({ advies, vorm }) => (
  <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2">
    <div>
      <h2 className="text-3xl font-semibold tracking-tight">{advies.titel}</h2>
      <p className="mt-3 text-foreground/70">{advies.intro}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {advies.punten.map((punt) => (
          <li key={punt._id} className="flex gap-3">
            <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
            <span>{punt.tekst}</span>
          </li>
        ))}
      </ul>
    </div>
    {/* Schematisch voorbeeld van de PDF */}
    <div className="mx-auto w-full max-w-sm rotate-1 rounded-xl bg-kaart p-8 shadow-lg ring-1 ring-foreground/10" aria-hidden="true">
      <p className="text-[10px] uppercase tracking-widest text-accent">Lida Thiry · Imago &amp; Kledingadvies</p>
      <p className="mt-4 font-serif text-2xl">Jouw persoonlijke kledingadvies</p>
      <p className="mt-1 font-serif text-lg text-accent">Type X — Zandloper</p>
      <div className="mt-6 flex gap-4">
        <Lichaam vorm={vorm(0)} armen={false} titel="" className="h-28 w-auto flex-none" />
        <div className="flex flex-1 flex-col gap-2 pt-2">
          <div className="h-2 w-full rounded bg-foreground/10" />
          <div className="h-2 w-5/6 rounded bg-foreground/10" />
          <div className="h-2 w-4/6 rounded bg-foreground/10" />
          <div className="mt-3 h-2 w-1/2 rounded bg-accent/40" />
          <div className="h-2 w-full rounded bg-foreground/10" />
          <div className="h-2 w-3/4 rounded bg-foreground/10" />
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-foreground/70">Voorbeeldweergave</p>
    </div>
  </section>
);

const Over: Blok = ({ over }) => (
  <section className="bg-accent-zacht/60">
    <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-[1fr_2fr]">
      <div
        className="mx-auto flex aspect-square w-48 items-center justify-center rounded-full bg-kaart font-serif text-5xl text-accent ring-1 ring-accent/20"
        aria-hidden="true"
      >
        {over.initialen}
      </div>
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">{over.titel}</h2>
        <div className="mt-4 flex flex-col gap-3 text-foreground/80 [&_a]:text-accent [&_a]:underline [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          <Opmaak tekst={over.tekst} />
        </div>
      </div>
    </div>
  </section>
);

function ReviewSterren({ aantal }: { aantal: number }) {
  return (
    <span className="text-lg leading-none tracking-widest text-accent" role="img" aria-label={`${aantal} van 5 sterren`}>
      {"★".repeat(aantal)}
      <span className="text-foreground/15">{"★".repeat(5 - aantal)}</span>
    </span>
  );
}

/**
 * Alleen als er goedgekeurde reviews of handmatig ingevulde ervaringen zijn.
 * Reviews (met sterren) eerst, daarna de handmatige ervaringen.
 */
const Ervaringen: Blok = ({ ervaringen, reviews }) => {
  const items = [
    ...reviews.map((r) => ({ key: `r-${r.id}`, citaat: r.tekst, naam: r.naam, sterren: r.sterren as number | null })),
    ...ervaringen.ervaringen.map((e) => ({ key: e._id, citaat: e.citaat, naam: e.naam, sterren: null })),
  ].filter((i) => i.citaat.trim());
  return (
    items.length > 0 && (
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{ervaringen.titel}</h2>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {items.map((e) => (
            <li key={e.key} className="flex flex-col gap-4 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
              {e.sterren ? (
                <ReviewSterren aantal={e.sterren} />
              ) : (
                <span className="font-serif text-4xl leading-none text-accent" aria-hidden="true">
                  &ldquo;
                </span>
              )}
              <blockquote className={`${e.sterren ? "" : "-mt-4 "}whitespace-pre-line text-foreground/80`}>{e.citaat}</blockquote>
              <p className="mt-auto text-sm text-foreground/70">{e.naam}</p>
            </li>
          ))}
        </ul>
      </section>
    )
  );
};

/** Alleen als er gepubliceerde berichten zijn. */
const Blog: Blok = ({ blog, blogberichten }) =>
  blogberichten.length > 0 && (
    <section aria-labelledby="laatste-blog" className="bg-accent-zacht/40">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <h2 id="laatste-blog" className="text-3xl font-semibold tracking-tight">
            {blog.titel}
          </h2>
          <Link
            href="/blog"
            className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
          >
            {blog.linktekst} →
          </Link>
        </div>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {blogberichten.map((b) => (
            <li key={b.id}>
              <BlogKaart bericht={b} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );

const Nieuwsbrief: Blok = ({ nieuwsbrief }) => (
  <section id="nieuwsbrief" className="mx-auto w-full max-w-5xl scroll-mt-8 px-6 py-16">
    <NieuwsbriefAanmelden teksten={nieuwsbrief} toestemming={<Opmaak tekst={nieuwsbrief.toestemming_tekst} />} />
  </section>
);

const Vragen: Blok = ({ vragen }) => (
  <section className="bg-kaart">
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <h2 className="text-center text-3xl font-semibold tracking-tight">{vragen.titel}</h2>
      <div className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">
        {vragen.vragen.map((v) => (
          <details key={v._id} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
              {v.vraag}
              <span className="text-xl text-accent transition-transform group-open:rotate-45" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="mt-3 whitespace-pre-line text-foreground/70">{v.antwoord}</p>
          </details>
        ))}
      </div>
    </div>
  </section>
);

const Afsluiting: Blok = ({ afsluiting, ctaTekst }) => (
  <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
    <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{afsluiting.titel}</h2>
    <p className="text-foreground/70">{afsluiting.tekst}</p>
    <Link href="/bestellen" className={CTA}>
      {ctaTekst}
    </Link>
  </section>
);

export const HOMEPAGE_WEERGAVE: Readonly<Record<HomepageBlok, Blok>> = {
  hero: Hero,
  stappen: Stappen,
  figuurtypes: Figuurtypes,
  advies: Advies,
  over: Over,
  ervaringen: Ervaringen,
  blog: Blog,
  nieuwsbrief: Nieuwsbrief,
  vragen: Vragen,
  afsluiting: Afsluiting,
};
